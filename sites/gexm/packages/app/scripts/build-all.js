const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const platforms = [
  { name: 'H5', script: 'build:h5', output: 'dist/build/h5', checkFile: 'index.html' },
  {
    name: '微信小程序',
    script: 'build:mp-weixin',
    output: 'dist/build/mp-weixin',
    checkFile: 'app.json',
  },
  {
    name: '支付宝小程序',
    script: 'build:mp-alipay',
    output: 'dist/build/mp-alipay',
    checkFile: 'app.json',
  },
  {
    name: '百度小程序',
    script: 'build:mp-baidu',
    output: 'dist/build/mp-baidu',
    checkFile: 'app.json',
  },
  {
    name: '头条小程序',
    script: 'build:mp-toutiao',
    output: 'dist/build/mp-toutiao',
    checkFile: 'app.json',
  },
]

function runBuild(platform) {
  console.log(`\n=== 开始构建 ${platform.name} ===`)
  try {
    execSync(`npm run ${platform.script}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      timeout: 300000,
    })

    const outputPath = path.join(__dirname, '..', platform.output)
    const checkPath = path.join(outputPath, platform.checkFile)

    if (fs.existsSync(checkPath)) {
      const stats = fs.statSync(outputPath)
      console.log(`✅ ${platform.name} 构建成功`)
      console.log(`📦 输出目录: ${outputPath}`)
      console.log(`📁 文件数量: ${countFiles(outputPath)}`)
      return { success: true, platform: platform.name, outputPath }
    } else {
      console.log(`❌ ${platform.name} 构建失败: 输出文件不存在`)
      return { success: false, platform: platform.name, error: '输出文件不存在' }
    }
  } catch (error) {
    console.log(`❌ ${platform.name} 构建失败: ${error.message}`)
    return { success: false, platform: platform.name, error: error.message }
  }
}

function countFiles(dir) {
  let count = 0
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      count += countFiles(fullPath)
    } else {
      count++
    }
  }
  return count
}

function main() {
  console.log('🚀 开始全平台构建测试')
  console.log('='.repeat(50))

  const results = platforms.map(runBuild)
  const successCount = results.filter((r) => r.success).length

  console.log('\n' + '='.repeat(50))
  console.log(`📊 构建结果: ${successCount}/${platforms.length} 成功`)

  results.forEach((result) => {
    if (result.success) {
      console.log(`  ✅ ${result.platform}`)
    } else {
      console.log(`  ❌ ${result.platform}: ${result.error}`)
    }
  })

  if (successCount === platforms.length) {
    console.log('\n🎉 所有平台构建成功!')
    process.exit(0)
  } else {
    console.log('\n⚠️ 部分平台构建失败，请检查错误信息')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
