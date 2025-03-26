/**
 * 包下载数据库
 * 负责处理 npm 包的下载和解压
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as tar from 'tar';
import { URL } from 'url';
import { logger } from '../managers/LogManager';
import { remotePluginDB } from './RemotePluginDB';

export class PackageDownloaderDB {
  private static instance: PackageDownloaderDB;

  private constructor() {}

  public static getInstance(): PackageDownloaderDB {
    if (!PackageDownloaderDB.instance) {
      PackageDownloaderDB.instance = new PackageDownloaderDB();
    }
    return PackageDownloaderDB.instance;
  }

  /**
   * 从URL下载文件到指定路径
   * @param url 下载地址
   * @param destPath 目标路径
   */
  public async downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      logger.info(`开始下载文件`, {
        url,
        destPath,
        protocol: parsedUrl.protocol,
      });

      // 确保目标目录存在
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        logger.info(`创建目标目录: ${destDir}`);
        fs.mkdirSync(destDir, { recursive: true });
      }

      const file = fs.createWriteStream(destPath);

      protocol
        .get(url, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            // 处理重定向
            const redirectUrl = response.headers.location!;
            logger.info(`请求被重定向`, {
              originalUrl: url,
              redirectUrl,
              statusCode: response.statusCode,
            });

            this.downloadFile(redirectUrl, destPath)
              .then(resolve)
              .catch(reject);
            return;
          }

          if (response.statusCode !== 200) {
            const errorMsg = `下载失败，状态码: ${response.statusCode}`;
            logger.error(errorMsg, {
              url,
              destPath,
              statusCode: response.statusCode,
            });
            reject(new Error(errorMsg));
            return;
          }

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            logger.info(`文件下载完成`, {
              url,
              destPath,
              size: fs.statSync(destPath).size,
            });
            resolve();
          });
        })
        .on('error', (err) => {
          fs.unlink(destPath, () => {}); // 清理部分下载的文件
          const errorMsg = `下载请求失败: ${err.message}`;
          logger.error(errorMsg, {
            url,
            destPath,
            error: err,
          });
          reject(new Error(errorMsg));
        });

      file.on('error', (err) => {
        fs.unlink(destPath, () => {}); // 清理部分下载的文件
        const errorMsg = `文件写入失败: ${err.message}`;
        logger.error(errorMsg, {
          url,
          destPath,
          error: err,
        });
        reject(new Error(errorMsg));
      });
    });
  }

  /**
   * 解压 tar.gz 文件
   * @param tarPath tar文件路径
   * @param extractPath 解压目标路径
   */
  public async extractTarball(
    tarPath: string,
    extractPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        tar
          .extract({
            file: tarPath,
            cwd: extractPath,
            strip: 1, // 去掉顶层的package目录
          })
          .then(() => {
            resolve();
          })
          .catch((err) => {
            reject(
              new Error(
                `解压文件失败: ${err instanceof Error ? err.message : String(err)}`
              )
            );
          });
      } catch (err) {
        reject(
          new Error(
            `解压初始化失败: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      }
    });
  }

  /**
   * 下载并解压NPM包到指定目录
   * @param packageName NPM包名
   * @param destinationDir 目标目录
   */
  public async downloadAndExtractPackage(
    packageName: string,
    destinationDir: string
  ): Promise<void> {
    // 1. 获取包的元数据
    const encodedPackageName = encodeURIComponent(packageName).replace(
      /%40/g,
      '@'
    );
    logger.info(`准备获取包元数据`, {
      packageName,
      encodedName: encodedPackageName,
      destinationDir,
    });

    const metadata =
      await remotePluginDB.fetchPackageMetadata(encodedPackageName);

    // 2. 获取最新版本和下载地址
    const latestVersion = metadata['dist-tags'].latest;
    const tarballUrl = metadata.versions[latestVersion].dist.tarball;

    logger.info(`获取到包信息`, {
      packageName,
      version: latestVersion,
      tarballUrl,
      shasum: metadata.versions[latestVersion].dist.shasum,
    });

    // 确保目标目录存在
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    // 3. 下载tar包
    const safePackageName = packageName.replace(/[@/]/g, '-');
    const tempTarPath = path.join(destinationDir, `${safePackageName}.tgz`);
    await this.downloadFile(tarballUrl, tempTarPath);

    // 4. 解压tar包到临时目录
    const tempDir = path.join(destinationDir, 'temp');
    if (fs.existsSync(tempDir)) {
      // 清理旧的临时目录
      fs.rmdirSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    logger.info(`开始解压tar包到: ${tempDir}`);
    await this.extractTarball(tempTarPath, tempDir);
    logger.info(`解压完成`);

    // 5. 移动文件到插件目录
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const srcPath = path.join(tempDir, file);
      const destPath = path.join(destinationDir, file);

      // 如果目标文件已存在，先删除
      if (fs.existsSync(destPath)) {
        if (fs.statSync(destPath).isDirectory()) {
          fs.rmdirSync(destPath, { recursive: true });
        } else {
          fs.unlinkSync(destPath);
        }
      }

      // 移动文件或目录
      fs.renameSync(srcPath, destPath);
    }

    // 6. 清理临时文件
    fs.rmdirSync(tempDir, { recursive: true });
    fs.unlinkSync(tempTarPath);

    logger.info(`包 ${packageName} (${latestVersion}) 下载并解压完成`);
  }
}

// 导出单例
export const packageDownloaderDB = PackageDownloaderDB.getInstance();
