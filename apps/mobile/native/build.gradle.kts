plugins {
  id("com.android.application") version "9.4.0"
}

layout.buildDirectory.set(file("../../../build/mobile/native"))

android {
  namespace = "com.toonflow.mobile"
  compileSdk {
    version = release(37) { minorApiLevel = 1 }
  }
  buildToolsVersion = "36.0.0"

  defaultConfig {
    applicationId = "com.toonflow.mobile"
    minSdk = 26
    targetSdk = 34
    versionCode = providers.gradleProperty("mobileVersionCode").orElse("1").get().toInt()
    versionName = providers.gradleProperty("mobileVersion").orElse("0.1.0").get()
    ndk { abiFilters += "arm64-v8a" }
  }

  signingConfigs {
    // ACT: keystore debug trong repo chỉ dùng cho build debug.
    create("defaultSigning") {
      storeFile = file("defaultSigning.keystore")
      storePassword = "android"
      keyAlias = "androiddebugkey"
      keyPassword = "android"
    }
  }
  val releaseStoreFile = providers.environmentVariable("SLSTUDIO_RELEASE_STORE_FILE").orNull
  val releaseSigning = if (releaseStoreFile != null) signingConfigs.create("releaseSigning") {
    storeFile = file(releaseStoreFile)
    storePassword = providers.environmentVariable("SLSTUDIO_RELEASE_STORE_PASSWORD").orNull
    keyAlias = providers.environmentVariable("SLSTUDIO_RELEASE_KEY_ALIAS").orNull
    keyPassword = providers.environmentVariable("SLSTUDIO_RELEASE_KEY_PASSWORD").orNull
  } else null
  buildTypes {
    debug { signingConfig = signingConfigs.getByName("defaultSigning") }
    release {
      // ACT: không bao giờ ký release bằng keystore debug công khai trong Git.
      signingConfig = releaseSigning ?: throw GradleException("Thiếu SLSTUDIO_RELEASE_STORE_FILE cho build release")
      isMinifyEnabled = true
      isShrinkResources = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
    }
  }
  sourceSets {
    getByName("main") {
      manifest.srcFile("../../../build/mobile/staging/manifest.xml")
      java.directories.apply { clear(); add(projectDir.path) }
      res.directories.apply { clear(); add("../../../build/mobile/staging/res") }
      assets.directories.apply { clear(); add("../../../build/mobile/staging/assets") }
      jniLibs.directories.apply { clear(); add("../../../build/mobile/staging/lib") }
    }
  }
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  lint { checkReleaseBuilds = false }
  packaging {
    jniLibs {
      useLegacyPackaging = true
      // ACT: 官方 Gecko 与 Bun 二进制已处理符号，保留原文件，避免安装 NDK 重新剥离。
      keepDebugSymbols += "**/*.so"
    }
  }
}

dependencies {
  implementation("org.mozilla.geckoview:geckoview-arm64-v8a:157.0.20261005135250")
}

tasks.withType<JavaCompile>().configureEach { options.encoding = "UTF-8" }

tasks.register("prepareDependencies") {
  doLast {
    androidComponents.sdkComponents.bootClasspath.get()
    configurations.getByName("debugCompileClasspath").files
    configurations.getByName("debugRuntimeClasspath").files
    configurations.getByName("releaseRuntimeClasspath").files
  }
}
