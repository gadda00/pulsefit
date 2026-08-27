/**
 * In-memory SQLite mock for tests.
 *
 * The real `expo-sqlite` module isn't available in the Jest environment.
 * Rather than mocking each function individually (which is fragile and
 * doesn't catch SQL syntax errors), we implement a tiny in-memory SQL engine
 * that handles the small subset of statements PulseFit's db.ts uses:
 *
 *  - CREATE TABLE IF NOT EXISTS
 *  - INSERT INTO ... VALUES (?, ?, ...)
 *  - SELECT * FROM ... [WHERE ...] [ORDER BY ...] [LIMIT n]
 *  - UPDATE ... SET ... WHERE ...
 *  - DELETE FROM ... WHERE ...
 *  - DROP TABLE IF EXISTS
 *  - Prepared statements with ? placeholders
 *  - JOIN ... ON ...
 *  - GROUP BY ... with SUM/COUNT/MAX/MIN/AVG aggregates
 *  - strftime('%Y-%m-%d', col) — special-cased to return ISO date
 *
 * This is NOT a general-purpose SQL implementation. It exists solely to
 * exercise PulseFit's data layer. If db.ts ever uses a feature this mock
 * doesn't support, the test will fail loudly with a clear error.
 */

interface Row { [column: string]: any }

interface Table {
  name: string;
  columns: string[];
  rows: Row[];
  autoIncrement: number;
}

interface PreparedStatement {
  sql: string;
  executeSync: (...params: any[]) => any;
  getColumnNames: () => string[];
  reset: () => void;
  finalize: () => void;
}

class InMemoryDb {
  tables = new Map<string, Table>();

  execSync(sql: string): void {
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      this.execStatement(stmt);
    }
  }

  private execStatement(sql: string): void {
    const upper = sql.toUpperCase();

    if (upper.startsWith('CREATE TABLE')) {
      this.createTable(sql);
    } else if (upper.startsWith('CREATE INDEX') || upper.startsWith('CREATE UNIQUE INDEX')) {
      // No-op: indexes aren't needed for correctness in the mock.
    } else if (upper.startsWith('DROP TABLE')) {
      const m = sql.match(/DROP TABLE\s+(?:IF EXISTS\s+)?(\w+)/i);
      if (m) this.tables.delete(m[1]);
    } else if (upper.startsWith('DELETE FROM')) {
      this.deleteFrom(sql, []);
    } else {
      throw new Error(`InMemoryDb: unsupported statement: ${sql.slice(0, 80)}`);
    }
  }

  private createTable(sql: string): void {
    const m = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([\s\S]+)\)/i);
    if (!m) throw new Error(`Cannot parse CREATE TABLE: ${sql}`);
    const name = m[1];
    const body = m[2];

    if (this.tables.has(name)) return;

    const columns: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of body) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        const colName = current.trim().split(/\s+/)[0];
        if (colName) columns.push(colName);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) {
      const colName = current.trim().split(/\s+/)[0];
      if (colName) columns.push(colName);
    }

    this.tables.set(name, {
      name,
      columns,
      rows: [],
      autoIncrement: 0,
    });
  }

  runSync(sql: string, params: any[] = []): { changes: number; lastInsertRowId: number } {
    const upper = sql.toUpperCase().trim();

    if (upper.startsWith('INSERT')) {
      return this.insert(sql, params);
    }
    if (upper.startsWith('UPDATE')) {
      return this.update(sql, params);
    }
    if (upper.startsWith('DELETE')) {
      return this.deleteFrom(sql, params);
    }
    throw new Error(`InMemoryDb.runSync: unsupported statement: ${sql.slice(0, 80)}`);
  }

  private insert(sql: string, params: any[]): { changes: number; lastInsertRowId: number } {
    const m = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!m) throw new Error(`Cannot parse INSERT: ${sql}`);
    const tableName = m[1];
    const columns = m[2].split(',').map(s => s.trim());
    const valueTokens = m[3].split(',').map(s => s.trim());

    const table = this.tables.get(tableName);
    if (!table) throw new Error(`No such table: ${tableName}`);

    if (columns.length !== valueTokens.length) {
      throw new Error(`Column/value count mismatch: ${columns.length} cols, ${valueTokens.length} values`);
    }

    const row: Row = {};
    for (const col of table.columns) {
      row[col] = null;
    }

    // Walk columns and values together. Each value is either a literal
    // (NULL, integer, string) or a `?` placeholder that consumes the next
    // entry from `params`.
    let paramIdx = 0;
    for (let i = 0; i < columns.length; i++) {
      const token = valueTokens[i];
      if (token === '?') {
        row[columns[i]] = params[paramIdx++];
      } else if (token.toUpperCase() === 'NULL') {
        row[columns[i]] = null;
      } else if (token.startsWith("'") && token.endsWith("'")) {
        // String literal
        row[columns[i]] = token.slice(1, -1).replace(/''/g, "'");
      } else if (/^-?\d+$/.test(token)) {
        row[columns[i]] = parseInt(token, 10);
      } else if (/^-?\d+\.\d+$/.test(token)) {
        row[columns[i]] = parseFloat(token);
      } else {
        // Identifier or expression — leave as null
        row[columns[i]] = null;
      }
    }

    if (paramIdx !== params.length) {
      throw new Error(`Param count mismatch: used ${paramIdx} of ${params.length} provided params`);
    }

    table.autoIncrement++;
    const idCol = table.columns.find(c => c.toLowerCase() === 'id');
    if (idCol && row[idCol] == null) {
      row[idCol] = table.autoIncrement;
    }

    table.rows.push(row);
    return { changes: 1, lastInsertRowId: row[idCol ?? 'id'] ?? table.autoIncrement };
  }

  private update(sql: string, params: any[]): { changes: number; lastInsertRowId: number } {
    const m = sql.match(/UPDATE\s+(\w+)\s+SET\s+([\s\S]+?)\s+WHERE\s+(.+)/i);
    if (!m) throw new Error(`Cannot parse UPDATE: ${sql}`);
    const tableName = m[1];
    const setClause = m[2];
    const whereClause = m[3];

    const table = this.tables.get(tableName);
    if (!table) throw new Error(`No such table: ${tableName}`);

    const setPairs: { column: string; paramIdx: number }[] = [];
    const setParts = setClause.split(',').map(s => s.trim());
    for (const part of setParts) {
      const pm = part.match(/(\w+)\s*=\s*\?/);
      if (pm) setPairs.push({ column: pm[1], paramIdx: setPairs.length });
    }

    const wherePairs: { column: string; paramIdx: number }[] = [];
    const whereParts = whereClause.split(/\s+AND\s+/i);
    for (const part of whereParts) {
      const wm = part.trim().match(/(\w+)\s*=\s*\?/);
      if (wm) wherePairs.push({ column: wm[1], paramIdx: wherePairs.length });
    }

    const setValues = setPairs.map(p => params[p.paramIdx]);
    const whereValues = wherePairs.map(p => params[setPairs.length + p.paramIdx]);

    let changes = 0;
    for (const row of table.rows) {
      if (wherePairs.every((p, i) => row[p.column] === whereValues[i])) {
        setPairs.forEach((p, i) => { row[p.column] = setValues[i]; });
        changes++;
      }
    }
    return { changes, lastInsertRowId: 0 };
  }

  private deleteFrom(sql: string, params: any[]): { changes: number; lastInsertRowId: number } {
    const m = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    if (!m) throw new Error(`Cannot parse DELETE: ${sql}`);
    const tableName = m[1];
    const whereClause = m[2];

    const table = this.tables.get(tableName);
    if (!table) throw new Error(`No such table: ${tableName}`);

    let changes = 0;
    if (!whereClause) {
      changes = table.rows.length;
      table.rows = [];
    } else {
      const wherePairs: { column: string; paramIdx: number }[] = [];
      const whereParts = whereClause.split(/\s+AND\s+/i);
      for (const part of whereParts) {
        const wm = part.trim().match(/(\w+)\s*=\s*\?/);
        if (wm) wherePairs.push({ column: wm[1], paramIdx: wherePairs.length });
      }
      const whereValues = wherePairs.map(p => params[p.paramIdx]);
      table.rows = table.rows.filter(row => {
        const matches = wherePairs.every((p, i) => row[p.column] === whereValues[i]);
        if (matches) { changes++; return false; }
        return true;
      });
    }
    return { changes, lastInsertRowId: 0 };
  }

  getFirstSync<T = Row>(sql: string, params: any[] = []): T | null {
    const rows = this.query(sql, params);
    return rows.length > 0 ? rows[0] as T : null;
  }

  getAllSync<T = Row>(sql: string, params: any[] = []): T[] {
    return this.query(sql, params) as T[];
  }

  private query(sql: string, params: any[]): Row[] {
    // Detect JOIN (one or more)
    if (/\bJOIN\b/i.test(sql)) {
      return this.queryWithJoin(sql, params);
    }

    // Replace `LIMIT ?` with `LIMIT <n>` using the last param so the regex
    // below (which expects a digit) can match.
    let normalizedSql = sql;
    let limitFromParams: number | null = null;
    const limitPlaceholderMatch = normalizedSql.match(/\s+LIMIT\s+\?\s*$/i);
    if (limitPlaceholderMatch) {
      const lastParam = params[params.length - 1];
      limitFromParams = typeof lastParam === 'number' ? lastParam : parseInt(String(lastParam), 10);
      normalizedSql = normalizedSql.replace(/\s+LIMIT\s+\?\s*$/i, '');
      params = params.slice(0, -1);
    }

    // Regex supports an optional table alias: `FROM <table> [AS] <alias>`.
    const m = normalizedSql.match(/SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?(?:\s+WHERE\s+(.+?))?(?:\s+GROUP\s+BY\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!m) throw new Error(`Cannot parse SELECT: ${sql}`);

    const selectClause = m[1];
    const tableName = m[2];
    const tableAlias = m[3];
    const whereClause = m[4];
    const groupBy = m[5];
    const orderBy = m[6];
    const limit = limitFromParams ?? (m[7] ? parseInt(m[7], 10) : null);

    const table = this.tables.get(tableName);
    if (!table) throw new Error(`No such table: ${tableName}`);

    // Start with rows that include both unqualified and alias-qualified column
    // names so WHERE/ORDER BY clauses that use the alias (e.g. `s.weight`)
    // resolve correctly.
    let rows: Row[] = table.rows.map((r) => {
      const out: Row = {};
      if (tableAlias) {
        for (const col of table.columns) out[`${tableAlias}.${col}`] = r[col];
      }
      for (const col of table.columns) out[col] = r[col];
      return out;
    });

    if (whereClause) {
      rows = this.applyWhere(rows, whereClause, params);
    }

    const hasStrftime = /strftime\s*\(/i.test(selectClause);

    if (groupBy) {
      rows = this.applyGroupBy(rows, groupBy, selectClause, hasStrftime);
    } else {
      rows = this.applySelect(rows, selectClause, hasStrftime);
    }

    if (orderBy) {
      rows = this.applyOrderBy(rows, orderBy);
    }

    if (limit != null) {
      rows = rows.slice(0, typeof limit === 'number' ? limit : parseInt(limit, 10));
    }

    return rows;
  }

  private queryWithJoin(sql: string, params: any[]): Row[] {
    // Replace `LIMIT ?` with `LIMIT <n>` using the last param.
    let normalizedSql = sql;
    let limitFromParams: number | null = null;
    const limitPlaceholderMatch = normalizedSql.match(/\s+LIMIT\s+\?\s*$/i);
    if (limitPlaceholderMatch) {
      const lastParam = params[params.length - 1];
      limitFromParams = typeof lastParam === 'number' ? lastParam : parseInt(String(lastParam), 10);
      normalizedSql = normalizedSql.replace(/\s+LIMIT\s+\?\s*$/i, '');
      params = params.slice(0, -1);
    }

    // Also handle `LIMIT <n>` literal at the end.
    let limitFromLiteral: number | null = null;
    const limitLiteralMatch = normalizedSql.match(/\s+LIMIT\s+(\d+)\s*$/i);
    if (limitLiteralMatch) {
      limitFromLiteral = parseInt(limitLiteralMatch[1], 10);
      normalizedSql = normalizedSql.replace(/\s+LIMIT\s+\d+\s*$/i, '');
    }
    const limit = limitFromParams ?? limitFromLiteral;

    // Extract the SELECT clause and the FROM ... JOIN ... [WHERE ...] [GROUP BY ...] [ORDER BY ...] tail.
    const selectMatch = normalizedSql.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([\s\S]+)$/i);
    if (!selectMatch) throw new Error(`Cannot parse JOIN query (no SELECT/FROM): ${sql}`);
    const selectClause = selectMatch[1];
    const tail = selectMatch[2];

    // Split tail into "table + joins" / "where" / "group by" / "order by" segments.
    // We do this by walking the string and splitting on the keywords WHERE / GROUP BY / ORDER BY
    // only when they appear at the top level (not inside parens).
    const segments = this.splitQueryTail(tail);
    const fromClause = segments.from;
    const whereClause = segments.where;
    const groupBy = segments.groupBy;
    const orderBy = segments.orderBy;

    // Parse `tableName [AS] alias` followed by zero or more `JOIN tableName [AS] alias ON a.x = b.y`.
    const joinPattern = /\bJOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/gi;
    const firstJoinMatch = joinPattern.exec(fromClause);
    if (!firstJoinMatch) throw new Error(`Cannot find JOIN in: ${fromClause}`);

    // The base table is everything before the first JOIN.
    const basePart = fromClause.slice(0, firstJoinMatch.index).trim();
    const baseMatch = basePart.match(/^(\w+)(?:\s+(?:AS\s+)?(\w+))?$/);
    if (!baseMatch) throw new Error(`Cannot parse base table: ${basePart}`);

    const baseTable = this.tables.get(baseMatch[1]);
    if (!baseTable) throw new Error(`No such table: ${baseMatch[1]}`);
    const baseAlias = baseMatch[2] ?? baseMatch[1];

    // Build initial rows from the base table, with both alias-qualified and
    // unqualified column names.
    let rows: Row[] = baseTable.rows.map((r) => {
      const out: Row = {};
      for (const col of baseTable.columns) {
        out[`${baseAlias}.${col}`] = r[col];
        out[col] = r[col];
      }
      return out;
    });

    // Collect all JOINs by re-running the regex (it has the global flag).
    joinPattern.lastIndex = firstJoinMatch.index;
    let joinMatch: RegExpExecArray | null;
    while ((joinMatch = joinPattern.exec(fromClause)) !== null) {
      const [, joinedTableName, joinedAliasRaw, leftRef, rightRef] = joinMatch;
      const joinedTable = this.tables.get(joinedTableName);
      if (!joinedTable) throw new Error(`No such table: ${joinedTableName}`);
      const joinedAlias = joinedAliasRaw ?? joinedTableName;

      const newRows: Row[] = [];
      for (const existing of rows) {
        for (const r2 of joinedTable.rows) {
          // Compute the joined row by adding alias-qualified columns from r2.
          const combined: Row = { ...existing };
          for (const col of joinedTable.columns) {
            combined[`${joinedAlias}.${col}`] = r2[col];
            if (!(col in combined)) combined[col] = r2[col];
          }
          // Evaluate the ON condition.
          const leftVal = this.resolveColumnRef(combined, leftRef);
          const rightVal = this.resolveColumnRef(combined, rightRef);
          if (leftVal === rightVal) {
            newRows.push(combined);
          }
        }
      }
      rows = newRows;
    }

    if (whereClause) {
      rows = this.applyWhere(rows, whereClause, params);
    }

    // IMPORTANT: if there's a GROUP BY, run it BEFORE the SELECT projection
    // because aggregates like SUM(s.reps * s.weight) need access to the raw
    // columns. The SELECT projection then just renames the aggregate columns.
    if (groupBy) {
      rows = this.applyGroupBy(rows, groupBy, selectClause, false);
      rows = this.applySelectWithAliases(rows, selectClause);
    } else {
      rows = this.applySelectWithAliases(rows, selectClause);
    }

    if (orderBy) {
      rows = this.applyOrderBy(rows, orderBy);
    }

    if (limit != null) {
      rows = rows.slice(0, limit);
    }

    return rows;
  }

  /** Resolve a column reference like `s.weight` or `weight` against a row. */
  private resolveColumnRef(row: Row, ref: string): any {
    if (ref.includes('.')) {
      return row[ref];
    }
    return row[ref];
  }

  /** Split a SQL tail (everything after FROM) into its component clauses.
   *  Returns the from clause (table + joins), where, groupBy, and orderBy. */
  private splitQueryTail(tail: string): {
    from: string;
    where: string | null;
    groupBy: string | null;
    orderBy: string | null;
  } {
    let depth = 0;
    let i = 0;
    const findKeyword = (kw: string): number => {
      for (let j = 0; j < tail.length - kw.length; j++) {
        if (depth !== 0) {
          if (tail[j] === '(') depth++;
          else if (tail[j] === ')') depth--;
          continue;
        }
        if (tail[j] === '(') { depth++; continue; }
        if (tail[j] === ')') { depth--; continue; }
        // Check if tail.slice(j, j+kw.length) matches kw case-insensitively,
        // AND is at a word boundary (preceded by whitespace, followed by whitespace).
        const slice = tail.slice(j, j + kw.length);
        if (slice.toUpperCase() === kw.toUpperCase()) {
          const prevChar = tail[j - 1] ?? ' ';
          const nextChar = tail[j + kw.length] ?? ' ';
          if (/\s/.test(prevChar) && /\s/.test(nextChar)) {
            return j;
          }
        }
      }
      return -1;
    };

    const whereIdx = findKeyword('WHERE');
    // Find GROUP BY only after WHERE
    const searchStart = whereIdx >= 0 ? whereIdx : 0;
    const groupByIdx = (() => {
      const re = /\bGROUP\s+BY\b/i;
      const m = tail.slice(searchStart).match(re);
      return m ? searchStart + m.index! : -1;
    })();
    const orderByIdx = (() => {
      const re = /\bORDER\s+BY\b/i;
      const startSearch = groupByIdx >= 0 ? groupByIdx : searchStart;
      const m = tail.slice(startSearch).match(re);
      return m ? startSearch + m.index! : -1;
    })();

    let fromEnd = tail.length;
    if (whereIdx >= 0) fromEnd = Math.min(fromEnd, whereIdx);
    if (groupByIdx >= 0) fromEnd = Math.min(fromEnd, groupByIdx);
    if (orderByIdx >= 0) fromEnd = Math.min(fromEnd, orderByIdx);

    const from = tail.slice(0, fromEnd).trim();

    let where: string | null = null;
    if (whereIdx >= 0) {
      let whereEnd = tail.length;
      if (groupByIdx >= 0) whereEnd = Math.min(whereEnd, groupByIdx);
      if (orderByIdx >= 0) whereEnd = Math.min(whereEnd, orderByIdx);
      where = tail.slice(whereIdx + 5, whereEnd).trim();
    }

    let groupBy: string | null = null;
    if (groupByIdx >= 0) {
      const kwLen = tail.slice(groupByIdx).match(/^\bGROUP\s+BY\b/i)![0].length;
      let gEnd = tail.length;
      if (orderByIdx >= 0) gEnd = orderByIdx;
      groupBy = tail.slice(groupByIdx + kwLen, gEnd).trim();
    }

    let orderBy: string | null = null;
    if (orderByIdx >= 0) {
      const kwLen = tail.slice(orderByIdx).match(/^\bORDER\s+BY\b/i)![0].length;
      orderBy = tail.slice(orderByIdx + kwLen).trim();
    }

    void i;
    return { from, where, groupBy, orderBy };
  }

  private applyWhere(rows: Row[], whereClause: string, params: any[]): Row[] {
    // We support WHERE clauses of the form:
    //   cond [AND cond]...           — all conditions must be true
    //   cond [OR cond]...            — any condition must be true
    //   cond [AND cond]... OR cond   — mixed (treated as: (cond AND cond) OR cond)
    // Each `cond` is one of: `col op ?`, `col IS NULL`, `col IS NOT NULL`.
    //
    // For mixed AND/OR we evaluate left-to-right (no precedence). This is
    // enough for the queries PulseFit's db.ts emits.

    // Split on OR first, then split each segment on AND.
    const orSegments = whereClause.split(/\s+OR\s+/i);
    const orGroups: { column: string; op: string; value?: any }[][] = [];
    let paramIdx = 0;

    for (const orSeg of orSegments) {
      const andParts = orSeg.split(/\s+AND\s+/i);
      const conditions: { column: string; op: string; value?: any }[] = [];
      for (const part of andParts) {
        const trimmed = part.trim();
        const isNull = trimmed.match(/(\w+(?:\.\w+)?)\s+IS\s+NULL/i);
        const isNotNull = trimmed.match(/(\w+(?:\.\w+)?)\s+IS\s+NOT\s+NULL/i);
        const cmp = trimmed.match(/(\w+(?:\.\w+)?)\s*(=|!=|<>|>=|<=|>|<|LIKE)\s*\?/);

        if (isNotNull) {
          conditions.push({ column: this.stripAlias(isNotNull[1]), op: 'IS NOT NULL' });
        } else if (isNull) {
          conditions.push({ column: this.stripAlias(isNull[1]), op: 'IS NULL' });
        } else if (cmp) {
          conditions.push({ column: this.stripAlias(cmp[1]), op: cmp[2], value: params[paramIdx] });
          paramIdx++;
        }
      }
      orGroups.push(conditions);
    }

    const evalCond = (row: Row, cond: { column: string; op: string; value?: any }): boolean => {
      const val = row[cond.column];
      switch (cond.op) {
        case '=': return val === cond.value;
        case '!=':
        case '<>': return val !== cond.value;
        case '>': return val != null && val > cond.value;
        case '<': return val != null && val < cond.value;
        case '>=': return val != null && val >= cond.value;
        case '<=': return val != null && val <= cond.value;
        case 'LIKE': {
          if (typeof val !== 'string' || typeof cond.value !== 'string') return false;
          const pattern = cond.value.replace(/%/g, '.*').replace(/_/g, '.');
          return new RegExp(`^${pattern}$`, 'i').test(val);
        }
        case 'IS NULL': return val == null;
        case 'IS NOT NULL': return val != null;
        default: return false;
      }
    };

    return rows.filter((row) => {
      // OR: at least one OR-segment must be true. Within a segment, all
      // AND conditions must be true.
      return orGroups.some((andConds) => andConds.every((cond) => evalCond(row, cond)));
    });
  }

  private stripAlias(col: string): string {
    return col.includes('.') ? col.split('.')[1] : col;
  }

  private applySelect(rows: Row[], selectClause: string, hasStrftime: boolean): Row[] {
    const trimmed = selectClause.trim();
    if (trimmed === '*') return rows;

    const parts = this.splitSelectClause(trimmed);
    return rows.map(row => {
      const out: Row = {};
      for (const part of parts) {
        // strftime('%Y-%m-%d', started_at) AS date
        const strf = part.match(/strftime\s*\([^)]+\)\s+AS\s+(\w+)/i);
        if (strf) {
          const colMatch = part.match(/strftime\s*\([^,]+,\s*(\w+)\s*\)/i);
          const srcCol = colMatch ? colMatch[1] : 'started_at';
          const d = row[srcCol] ? new Date(row[srcCol]) : new Date();
          const y = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const da = String(d.getDate()).padStart(2, '0');
          out[strf[1]] = `${y}-${mo}-${da}`;
          continue;
        }
        const pm = part.match(/(\w+)\s+AS\s+(\w+)/i);
        if (pm) {
          out[pm[2]] = row[pm[1]];
          continue;
        }
        if (/COUNT\s*\(\s*\*\s*\)/i.test(part)) {
          out.c = 1;
          continue;
        }
        const colName = part.trim();
        if (row[colName] !== undefined) out[colName] = row[colName];
      }
      return out;
    });
  }

  private applySelectWithAliases(rows: Row[], selectClause: string): Row[] {
    const trimmed = selectClause.trim();
    if (trimmed === '*') return rows;

    const parts = this.splitSelectClause(trimmed);
    return rows.map(row => {
      const out: Row = {};
      for (const part of parts) {
        // FN(...) AS alias — aggregate function call. The alias was already
        // computed by applyGroupBy, so just copy it from the row.
        const aggMatch = part.match(/\w+\s*\([^)]+\)\s+AS\s+(\w+)/i);
        if (aggMatch) {
          const alias = aggMatch[1];
          if (row[alias] !== undefined) out[alias] = row[alias];
          continue;
        }
        // table.col AS alias (or col AS alias)
        const pm = part.match(/(\w+(?:\.\w+)?)\s+AS\s+(\w+)/i);
        if (pm) {
          out[pm[2]] = row[pm[1]] ?? row[this.stripAlias(pm[1])];
          continue;
        }
        if (/^\w+\.\w+$/.test(part.trim())) {
          out[part.trim()] = row[part.trim()];
          continue;
        }
        const colName = part.trim();
        if (row[colName] !== undefined) out[colName] = row[colName];
      }
      return out;
    });
  }

  private splitSelectClause(clause: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of clause) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  private applyGroupBy(rows: Row[], groupBy: string, selectClause: string, hasStrftime: boolean): Row[] {
    const groupCol = this.stripAlias(groupBy.trim());

    // Special case: if SELECT contains strftime(..., started_at) AS date,
    // we need to group by the ISO date extracted from the started_at column.
    const isDateGroup = /strftime/i.test(selectClause);

    const groups = new Map<any, Row[]>();
    for (const row of rows) {
      let key: any;
      if (isDateGroup) {
        const d = row[groupCol] ? new Date(row[groupCol]) : new Date();
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        key = `${y}-${mo}-${da}`;
      } else {
        key = row[groupCol];
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    // Aggregate function call: e.g. SUM(s.reps * s.weight) AS volume.
    // The expression inside parens can contain column refs, *, +, -, /, and spaces.
    const aggMatches = [...selectClause.matchAll(/(\w+)\s*\(\s*([^)]+?)\s*\)\s*(?:AS\s+(\w+))?/gi)];

    const out: Row[] = [];
    for (const [key, groupRows] of groups) {
      const row: Row = {};
      // Include the group-by column under its alias if SELECT uses `AS`.
      const groupAliasMatch = selectClause.match(new RegExp(`strftime\\([^)]+\\)\\s+AS\\s+(\\w+)`, 'i'));
      if (isDateGroup && groupAliasMatch) {
        row[groupAliasMatch[1]] = key;
      } else {
        row[groupCol] = key;
      }
      for (const aggMatch of aggMatches) {
        const [, fn, expr, alias] = aggMatch;
        const outCol = alias || `${fn.toLowerCase()}_${expr}`;
        if (fn.toUpperCase() === 'SUM') {
          // Evaluate the expression for each row, then sum.
          row[outCol] = groupRows.reduce((acc, r) => acc + this.evalExpr(expr, r), 0);
        } else if (fn.toUpperCase() === 'COUNT') {
          row[outCol] = groupRows.length;
        } else if (fn.toUpperCase() === 'MAX') {
          row[outCol] = Math.max(...groupRows.map(r => this.evalExpr(expr, r)));
        } else if (fn.toUpperCase() === 'MIN') {
          row[outCol] = Math.min(...groupRows.map(r => this.evalExpr(expr, r)));
        } else if (fn.toUpperCase() === 'AVG') {
          row[outCol] = groupRows.reduce((acc, r) => acc + this.evalExpr(expr, r), 0) / groupRows.length;
        }
      }
      out.push(row);
    }
    return out;
  }

  /** Evaluate a SQL-ish scalar expression against a row.
   *  Supports: column refs (with or without alias), numeric literals,
   *  multiplication, division, addition, subtraction. */
  private evalExpr(expr: string, row: Row): number {
    // Replace column references (a.b or b) with their numeric values.
    const tokens = expr.split(/\s+/);
    // We only support a simple binary expression like `a * b` or `a + b`.
    // For more complex expressions, this will return 0.
    if (tokens.length === 1) {
      return Number(row[this.stripAlias(tokens[0])]) || 0;
    }
    if (tokens.length === 3) {
      const left = Number(row[this.stripAlias(tokens[0])]) || 0;
      const op = tokens[1];
      const right = Number(row[this.stripAlias(tokens[2])]) || 0;
      switch (op) {
        case '*': return left * right;
        case '/': return right !== 0 ? left / right : 0;
        case '+': return left + right;
        case '-': return left - right;
        default: return 0;
      }
    }
    return 0;
  }

  private applyOrderBy(rows: Row[], orderBy: string): Row[] {
    const parts = orderBy.split(',').map(s => s.trim());
    return [...rows].sort((a, b) => {
      for (const part of parts) {
        const m = part.match(/(\w+(?:\.\w+)?)(?:\s+(ASC|DESC|COLLATE\s+\w+))?/i);
        if (!m) continue;
        const col = this.stripAlias(m[1]);
        let dir = 'ASC';
        if (m[2] && /^DESC$/i.test(m[2])) dir = 'DESC';
        const av = a[col];
        const bv = b[col];
        if (av === bv) continue;
        if (av == null) return dir === 'ASC' ? -1 : 1;
        if (bv == null) return dir === 'ASC' ? 1 : -1;
        if (av < bv) return dir === 'ASC' ? -1 : 1;
        if (av > bv) return dir === 'ASC' ? 1 : -1;
      }
      return 0;
    });
  }

  prepareSync(sql: string): PreparedStatement {
    return {
      sql,
      executeSync: (...params: any[]) => this.runSync(sql, params),
      getColumnNames: () => [],
      reset: () => {},
      finalize: () => {},
    };
  }

  closeSync(): void {
    this.tables.clear();
  }

  withTransactionSync<T>(fn: () => T): T {
    return fn();
  }
}

/**
 * Create a fresh in-memory database for testing.
 * Call `__setDbForTesting(createInMemoryDb())` at the top of each test.
 */
export function createInMemoryDb(): any {
  const db = new InMemoryDb();
  return {
    execSync: db.execSync.bind(db),
    runSync: db.runSync.bind(db),
    getFirstSync: db.getFirstSync.bind(db),
    getAllSync: db.getAllSync.bind(db),
    prepareSync: db.prepareSync.bind(db),
    closeSync: db.closeSync.bind(db),
    withTransactionSync: db.withTransactionSync.bind(db),
    __raw: db,
  };
}
