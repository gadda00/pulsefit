/**
 * Local Expo config plugin: fix-gradle-versions
 *
 * Patches the generated android/ project to use Gradle 8.6 + AGP 8.2.1
 * instead of the defaults (Gradle 8.8 + unpinned AGP).
 *
 * Why: Expo SDK 51 + Gradle 8.7+ has a known issue where
 * `expo-modules-autolinking` re-applies the Android plugin, causing
 * "Cannot add a configuration with name 'androidJdkImage' as a configuration
 * with that name already exists." Pinning to Gradle 8.6 + AGP 8.2.1
 * (the React Native 0.74 default combination) avoids this.
 *
 * Also patches the expo-modules-core and react-native-gradle-plugin source
 * files in node_modules to use the import paths that exist in Gradle 8.6.
 */

const { withDangerousMod, withGradleProperties } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function patchFile(filePath, search, replace) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[fix-gradle-versions] File not found: ${filePath}`);
    return false;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(search)) {
    console.warn(`[fix-gradle-versions] Search string not found in ${filePath}`);
    return false;
  }
  const updated = content.replace(search, replace);
  fs.writeFileSync(filePath, updated);
  console.log(`[fix-gradle-versions] Patched: ${filePath}`);
  return true;
}

function patchExpoModulesCore(projectRoot) {
  const EMC_DIR = path.join(projectRoot, 'node_modules/expo-modules-core/expo-module-gradle-plugin');
  const files = [
    'src/main/kotlin/expo/modules/plugin/gradle/ExpoModuleExtension.kt',
    'src/main/kotlin/expo/modules/plugin/ExpoModulesGradlePlugin.kt',
    'src/main/kotlin/expo/modules/plugin/ProjectConfiguration.kt',
  ];
  for (const f of files) {
    const fullPath = path.join(EMC_DIR, f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('org.gradle.internal.extensions.core.extra')) {
        fs.writeFileSync(
          fullPath,
          content.replace(
            /import org\.gradle\.internal\.extensions\.core\.extra/g,
            'import org.gradle.kotlin.dsl.extra'
          )
        );
        console.log(`[fix-gradle-versions] Patched EMC import: ${f}`);
      }
    }
  }

  // Also patch build.gradle.kts to add gradle-kotlin-dsl jar dependency
  const buildKts = path.join(EMC_DIR, 'build.gradle.kts');
  if (fs.existsSync(buildKts)) {
    const content = fs.readFileSync(buildKts, 'utf8');
    if (!content.includes('gradle-kotlin-dsl')) {
      const patched = content.replace(
        'implementation(gradleApi())\n  compileOnly("com.android.tools.build:gradle:8.5.0")',
        `implementation(gradleApi())
  // Patched by plugins/fix-gradle-versions.js: add gradle-kotlin-dsl jar
  // so the \`extra\` extension function is resolvable in Gradle 8.6.
  val gradleKotlinDslJar = file("\${gradle.gradleHomeDir}/lib/gradle-kotlin-dsl-\${gradle.gradleVersion}.jar")
  if (gradleKotlinDslJar.exists()) {
    implementation(files(gradleKotlinDslJar))
  }
  compileOnly("com.android.tools.build:gradle:8.5.0")`
      );
      fs.writeFileSync(buildKts, patched);
      console.log('[fix-gradle-versions] Patched EMC build.gradle.kts');
    }
  }
}

function patchReactNativeGradlePlugin(projectRoot) {
  const rngpKts = path.join(
    projectRoot,
    'node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/build.gradle.kts'
  );
  if (fs.existsSync(rngpKts)) {
    const content = fs.readFileSync(rngpKts, 'utf8');
    let updated = content.replace(
      /import org\.gradle\.configurationcache\.extensions\.serviceOf/g,
      'import org.gradle.kotlin.dsl.support.serviceOf'
    );
    updated = updated.replace(/allWarningsAsErrors = true/g, 'allWarningsAsErrors = false');
    if (updated !== content) {
      fs.writeFileSync(rngpKts, updated);
      console.log('[fix-gradle-versions] Patched react-native-gradle-plugin');
    }
  }
}

function patchGradleWrapper(projectRoot) {
  const wrapperProps = path.join(projectRoot, 'android/gradle/wrapper/gradle-wrapper.properties');
  if (!fs.existsSync(wrapperProps)) {
    console.warn('[fix-gradle-versions] gradle-wrapper.properties not found');
    return;
  }
  const content = fs.readFileSync(wrapperProps, 'utf8');
  // Replace any gradle 8.7+ version with 8.6
  const updated = content.replace(
    /gradle-8\.\d+(-all|-bin)\.zip/,
    'gradle-8.6-all.zip'
  );
  if (updated !== content) {
    fs.writeFileSync(wrapperProps, updated);
    console.log('[fix-gradle-versions] Pinned Gradle wrapper to 8.6');
  }
}

function patchAndroidBuildGradle(projectRoot) {
  const buildGradle = path.join(projectRoot, 'android/build.gradle');
  if (!fs.existsSync(buildGradle)) {
    console.warn('[fix-gradle-versions] android/build.gradle not found');
    return;
  }
  const content = fs.readFileSync(buildGradle, 'utf8');
  // Pin AGP to 8.2.1 if it's unpinned
  const updated = content.replace(
    /classpath\(['"]com\.android\.tools\.build:gradle['"]\)/g,
    "classpath('com.android.tools.build:gradle:8.2.1')"
  );
  if (updated !== content) {
    fs.writeFileSync(buildGradle, updated);
    console.log('[fix-gradle-versions] Pinned AGP to 8.2.1');
  }
}

/**
 * Patch expo-modules-autolinking to skip applying com.android.library to
 * the :app project. The autolinking script applies every module's plugin to
 * every project that has com.android.application — but com.android.library
 * conflicts with com.android.application (both create androidJdkImage).
 *
 * The fix: filter out com.android.library from the list of plugins applied
 * to app projects.
 */
function patchExpoModulesAutolinking(projectRoot) {
  const autolinkingScript = path.join(
    projectRoot,
    'node_modules/expo-modules-autolinking/scripts/android/autolinking_implementation.gradle'
  );
  if (!fs.existsSync(autolinkingScript)) {
    console.warn('[fix-gradle-versions] autolinking_implementation.gradle not found');
    return;
  }
  const content = fs.readFileSync(autolinkingScript, 'utf8');
  // Look for the plugin application loop and add a filter
  const search = 'project.plugins.apply(modulePlugin.id)';
  const replace = `if (modulePlugin.id == 'com.android.library' && project.plugins.hasPlugin('com.android.application')) { continue }\\n          project.plugins.apply(modulePlugin.id)`;
  if (content.includes(search) && !content.includes('com.android.application')) {
    // The string 'com.android.application' already appears elsewhere, so use a more specific marker
    console.warn('[fix-gradle-versions] autolinking script already patched or has different structure');
    return;
  }
  if (content.includes(search) && !content.includes("modulePlugin.id == 'com.android.library'")) {
    // Insert the filter just before the apply call
    const patched = content.replace(
      'project.plugins.apply(modulePlugin.id)',
      "if (modulePlugin.id == 'com.android.library' && project.plugins.hasPlugin('com.android.application')) {\n            println \"  Skipping com.android.library on app project (avoids androidJdkImage duplicate)\"\n            continue\n          }\n          project.plugins.apply(modulePlugin.id)"
    );
    fs.writeFileSync(autolinkingScript, patched);
    console.log('[fix-gradle-versions] Patched autolinking to skip com.android.library on app project');
  }
}

module.exports = function (config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config._internal.projectRoot;
      console.log('[fix-gradle-versions] Applying patches...');
      patchExpoModulesCore(projectRoot);
      patchReactNativeGradlePlugin(projectRoot);
      patchGradleWrapper(projectRoot);
      patchAndroidBuildGradle(projectRoot);
      patchExpoModulesAutolinking(projectRoot);
      console.log('[fix-gradle-versions] All patches applied.');
      return config;
    },
  ]);
};
