#!/usr/bin/env bash
# Patches expo-modules-core and react-native-gradle-plugin to be compatible
# with Gradle 8.6 (which is what EAS Build uses for Expo SDK 51).
#
# The issue: the published source uses import paths that don't exist in
# Gradle 8.6 (they were added in 8.11+). This script rewrites the imports
# to the Gradle 8.6 equivalents and adds the gradle-kotlin-dsl jar to the
# buildscript classpath so the `extra` extension function is resolvable.
#
# Run automatically via package.json's postinstall hook.
set -e

EMC_DIR="node_modules/expo-modules-core/expo-module-gradle-plugin"
RNGP_DIR="node_modules/@react-native/gradle-plugin/react-native-gradle-plugin"

if [ ! -d "$EMC_DIR" ]; then
  echo "[patches] expo-modules-core not found, skipping"
  exit 0
fi

# 1. Patch expo-modules-core: use org.gradle.kotlin.dsl.extra (available in
#    gradle-kotlin-dsl-8.6.jar) instead of org.gradle.internal.extensions.core.extra
#    (which only exists in Gradle 8.11+).
for f in \
  "$EMC_DIR/src/main/kotlin/expo/modules/plugin/gradle/ExpoModuleExtension.kt" \
  "$EMC_DIR/src/main/kotlin/expo/modules/plugin/ExpoModulesGradlePlugin.kt" \
  "$EMC_DIR/src/main/kotlin/expo/modules/plugin/ProjectConfiguration.kt"; do
  if [ -f "$f" ]; then
    sed -i 's|import org.gradle.internal.extensions.core.extra|import org.gradle.kotlin.dsl.extra|g' "$f"
  fi
done

# 2. Patch expo-modules-core build.gradle.kts: add the gradle-kotlin-dsl jar
#    to the buildscript classpath so the `extra` extension resolves.
BUILD_KTS="$EMC_DIR/build.gradle.kts"
if [ -f "$BUILD_KTS" ] && ! grep -q "gradle-kotlin-dsl" "$BUILD_KTS"; then
  python3 -c "
import sys
with open('$BUILD_KTS') as f:
    content = f.read()
patched = content.replace(
    'implementation(gradleApi())\n  compileOnly(\"com.android.tools.build:gradle:8.5.0\")',
    'implementation(gradleApi())\n  // Patched by patches/apply-gradle-fixes.sh:\n  // add gradle-kotlin-dsl jar so the \`extra\` extension function is resolvable.\n  val gradleKotlinDslJar = file(\"\${gradle.gradleHomeDir}/lib/gradle-kotlin-dsl-\${gradle.gradleVersion}.jar\")\n  if (gradleKotlinDslJar.exists()) {\n    implementation(files(gradleKotlinDslJar))\n  }\n  compileOnly(\"com.android.tools.build:gradle:8.5.0\")'
)
with open('$BUILD_KTS', 'w') as f:
    f.write(patched)
print('[patches] Patched expo-modules-core build.gradle.kts')
"
fi

# 3. Patch react-native-gradle-plugin: use org.gradle.kotlin.dsl.support.serviceOf
#    (available in gradle-kotlin-dsl-8.6.jar) instead of
#    org.gradle.configurationcache.extensions.serviceOf (Gradle 8.11+ only).
RNGP_KTS="$RNGP_DIR/build.gradle.kts"
if [ -f "$RNGP_KTS" ]; then
  sed -i 's|import org.gradle.configurationcache.extensions.serviceOf|import org.gradle.kotlin.dsl.support.serviceOf|g' "$RNGP_KTS"
  # Disable allWarningsAsErrors so deprecation warnings don't fail the build.
  sed -i 's|allWarningsAsErrors = true|allWarningsAsErrors = false|g' "$RNGP_KTS"
  echo "[patches] Patched react-native-gradle-plugin"
fi

echo "[patches] Done."
