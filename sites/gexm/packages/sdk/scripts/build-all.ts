import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

const platforms = ['web', 'mp-weixin', 'mp-alipay', 'mp-baidu', 'mp-toutiao', 'app-plus'];

const configFiles: Record<string, string> = {
  'web': 'vite.config.web.ts',
  'mp-weixin': 'vite.config.mp-weixin.ts',
  'mp-alipay': 'vite.config.mp-alipay.ts',
};

interface BuildResult {
  platform: string;
  success: boolean;
  duration: number;
  size?: {
    js: number;
    dts: number;
  };
  error?: string;
}

function runBuild(platform: string): BuildResult {
  const startTime = Date.now();
  const configFile = configFiles[platform] || 'vite.config.ts';
  const configPath = path.resolve(__dirname, '..', configFile);

  console.log(`\n=== Building for ${platform} ===`);
  console.log(`Using config: ${configFile}`);

  try {
    execSync(
      `npx vite build --config ${configPath}`,
      {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    const duration = Date.now() - startTime;
    const outDir = path.resolve(__dirname, '..', 'dist', platform);
    
    let size: { js: number; dts: number } | undefined;
    if (fs.existsSync(outDir)) {
      const files = fs.readdirSync(outDir);
      const jsFiles = files.filter(f => f.endsWith('.js'));
      const dtsFiles = files.filter(f => f.endsWith('.d.ts'));
      
      const jsSize = jsFiles.reduce((sum, f) => {
        const stats = fs.statSync(path.join(outDir, f));
        return sum + stats.size;
      }, 0);
      
      const dtsSize = dtsFiles.reduce((sum, f) => {
        const stats = fs.statSync(path.join(outDir, f));
        return sum + stats.size;
      }, 0);
      
      size = { js: jsSize, dts: dtsSize };
    }

    console.log(`✓ ${platform} build completed in ${(duration / 1000).toFixed(2)}s`);
    if (size) {
      console.log(`  JS size: ${(size.js / 1024).toFixed(2)} KB`);
      console.log(`  DTS size: ${(size.dts / 1024).toFixed(2)} KB`);
    }

    return { platform, success: true, duration, size };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMsg = error.stdout || error.stderr || String(error);
    
    console.log(`✗ ${platform} build failed after ${(duration / 1000).toFixed(2)}s`);
    console.log(`  Error: ${errorMsg.substring(0, 500)}`);

    return { platform, success: false, duration, error: errorMsg };
  }
}

function generateBuildReport(results: BuildResult[]) {
  const reportDir = path.resolve(__dirname, '..', 'build-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `build-report-${timestamp}.md`);

  const successCount = results.filter(r => r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  let report = `# GexmSDK Build Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Platforms | ${results.length} |\n`;
  report += `| Successful | ${successCount} |\n`;
  report += `| Failed | ${results.length - successCount} |\n`;
  report += `| Total Duration | ${(totalDuration / 1000).toFixed(2)}s |\n\n`;

  report += `## Platform Results\n\n`;
  report += `| Platform | Status | Duration | JS Size | DTS Size |\n`;
  report += `|----------|--------|----------|---------|----------|\n`;

  results.forEach(result => {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    const jsSize = result.size ? `${(result.size.js / 1024).toFixed(2)} KB` : '-';
    const dtsSize = result.size ? `${(result.size.dts / 1024).toFixed(2)} KB` : '-';
    
    report += `| ${result.platform} | ${status} | ${(result.duration / 1000).toFixed(2)}s | ${jsSize} | ${dtsSize} |\n`;
  });

  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\nBuild report generated: ${reportPath}`);
}

function main() {
  console.log('=== GexmSDK Multi-Platform Build ===');
  console.log(`Building for ${platforms.length} platforms...\n`);

  const results: BuildResult[] = [];

  for (const platform of platforms) {
    const result = runBuild(platform);
    results.push(result);
  }

  generateBuildReport(results);

  const hasFailures = results.some(r => !r.success);
  if (hasFailures) {
    console.log('\n❌ Some builds failed. Check the build report for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All builds completed successfully!');
    process.exit(0);
  }
}

main();