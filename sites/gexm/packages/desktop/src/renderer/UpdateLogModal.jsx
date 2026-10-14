import React, { useState, useEffect, useCallback } from 'react';

const UpdateLogModal = ({ 
  isOpen, 
  onClose, 
  updateInfo, 
  onDownload, 
  onInstall, 
  onCheck,
  downloadProgress,
  isDownloading
}) => {
  const [releaseNotes, setReleaseNotes] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (updateInfo?.releaseNotes) {
      setReleaseNotes(updateInfo.releaseNotes);
    }
  }, [updateInfo]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return '';
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  if (!isOpen) return null;

  const renderProgressBar = () => {
    if (!downloadProgress) return null;
    const percent = downloadProgress.percent || 0;
    return (
      <div className="update-progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="progress-info">
          <span className="progress-percent">{percent.toFixed(1)}%</span>
          <span className="progress-detail">
            {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
          </span>
          {downloadProgress.bytesPerSecond && (
            <span className="progress-speed">{formatSpeed(downloadProgress.bytesPerSecond)}</span>
          )}
        </div>
      </div>
    );
  };

  const renderUpdateAvailable = () => (
    <div className="update-content">
      <div className="update-icon">🚀</div>
      <h2>发现新版本</h2>
      <div className="update-version">v{updateInfo?.version}</div>
      {updateInfo?.releaseDate && (
        <div className="update-date">发布于: {formatDate(updateInfo.releaseDate)}</div>
      )}
      {updateInfo?.size && (
        <div className="update-size">安装包大小: {formatBytes(updateInfo.size)}</div>
      )}
      {renderProgressBar()}
      {releaseNotes && (
        <div className="release-notes">
          <h3>更新日志</h3>
          <div className="notes-content" dangerouslySetInnerHTML={{ __html: releaseNotes }} />
        </div>
      )}
      <div className="update-actions">
        {isDownloading ? (
          <button className="btn btn-secondary" disabled>
            正在下载...
          </button>
        ) : (
          <>
            <button className="btn btn-primary" onClick={onDownload}>
              下载更新
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              稍后再说
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderNoUpdate = () => (
    <div className="update-content">
      <div className="update-icon">✨</div>
      <h2>已是最新版本</h2>
      <div className="current-version">当前版本: v{updateInfo?.currentVersion}</div>
      <div className="update-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          确定
        </button>
      </div>
    </div>
  );

  const renderDownloaded = () => (
    <div className="update-content">
      <div className="update-icon">✅</div>
      <h2>更新已准备就绪</h2>
      <div className="update-version">v{updateInfo?.version}</div>
      <div className="update-message">更新将在重启后自动安装</div>
      <div className="update-actions">
        <button className="btn btn-primary" onClick={onInstall}>
          立即重启安装
        </button>
        <button className="btn btn-secondary" onClick={onClose}>
          下次再说
        </button>
      </div>
    </div>
  );

  const renderChecking = () => (
    <div className="update-content">
      <div className="update-icon loading">🔄</div>
      <h2>正在检查更新...</h2>
    </div>
  );

  const renderDownloading = () => (
    <div className="update-content">
      <div className="update-icon loading">📥</div>
      <h2>正在下载更新</h2>
      {renderProgressBar()}
      <div className="update-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          后台下载
        </button>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="update-content">
      <div className="update-icon">❌</div>
      <h2>检查更新失败</h2>
      <div className="error-message">{updateInfo?.message}</div>
      <div className="update-actions">
        <button className="btn btn-primary" onClick={onCheck}>
          重试
        </button>
        <button className="btn btn-secondary" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );

  const getStatus = () => {
    if (updateInfo?.error) return 'error';
    if (updateInfo?.downloaded) return 'downloaded';
    if (updateInfo?.downloading) return 'downloading';
    if (updateInfo?.checking) return 'checking';
    if (updateInfo?.available) return 'available';
    return 'no-update';
  };

  return (
    <div className="update-modal-overlay" onClick={onClose}>
      <div className="update-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        {updateInfo?.available && renderUpdateAvailable()}
        {updateInfo?.noUpdate && renderNoUpdate()}
        {updateInfo?.downloaded && renderDownloaded()}
        {updateInfo?.downloading && renderDownloading()}
        {updateInfo?.checking && renderChecking()}
        {updateInfo?.error && renderError()}
      </div>
    </div>
  );
};

export const UpdatePanel = ({ onDownloadProgress }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (window.gexmDesktop?.on) {
      const handleUpdateAvailable = (data) => {
        setUpdateStatus({ available: true, ...data });
      };

      const handleUpdateNotAvailable = (data) => {
        setUpdateStatus({ noUpdate: true, currentVersion: data.currentVersion });
      };

      const handleUpdateProgress = (progress) => {
        setDownloadProgress(progress);
        onDownloadProgress?.(progress);
      };

      const handleUpdateDownloaded = (data) => {
        setIsDownloading(false);
        setUpdateStatus({ downloaded: true, version: data.version });
      };

      const handleUpdateError = (data) => {
        setIsDownloading(false);
        setUpdateStatus({ error: true, message: data.message });
      };

      const handleUpdateDownloading = (data) => {
        setIsDownloading(true);
        setUpdateStatus({ downloading: true, version: data.version });
      };

      const handleUpdateChecking = () => {
        setUpdateStatus({ checking: true });
      };

      window.gexmDesktop.on('update-available', handleUpdateAvailable);
      window.gexmDesktop.on('update-not-available', handleUpdateNotAvailable);
      window.gexmDesktop.on('update-progress', handleUpdateProgress);
      window.gexmDesktop.on('update-downloaded', handleUpdateDownloaded);
      window.gexmDesktop.on('update-error', handleUpdateError);
      window.gexmDesktop.on('update-downloading', handleUpdateDownloading);
      window.gexmDesktop.on('update-checking', handleUpdateChecking);

      return () => {
        window.gexmDesktop.removeListener?.('update-available', handleUpdateAvailable);
        window.gexmDesktop.removeListener?.('update-not-available', handleUpdateNotAvailable);
        window.gexmDesktop.removeListener?.('update-progress', handleUpdateProgress);
        window.gexmDesktop.removeListener?.('update-downloaded', handleUpdateDownloaded);
        window.gexmDesktop.removeListener?.('update-error', handleUpdateError);
        window.gexmDesktop.removeListener?.('update-downloading', handleUpdateDownloading);
        window.gexmDesktop.removeListener?.('update-checking', handleUpdateChecking);
      };
    }
  }, [onDownloadProgress]);

  const handleCheck = async () => {
    setIsModalOpen(true);
    setUpdateStatus(null);
    setDownloadProgress(null);
    if (window.gexmDesktop?.updater?.check) {
      await window.gexmDesktop.updater.check();
    }
  };

  const handleDownload = async () => {
    if (window.gexmDesktop?.updater?.download) {
      await window.gexmDesktop.updater.download();
    }
  };

  const handleInstall = () => {
    if (window.gexmDesktop?.updater?.install) {
      window.gexmDesktop.updater.install();
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button className="update-check-btn" onClick={handleCheck}>
        检查更新
      </button>
      <UpdateLogModal
        isOpen={isModalOpen}
        onClose={handleClose}
        updateInfo={updateStatus}
        onDownload={handleDownload}
        onInstall={handleInstall}
        onCheck={handleCheck}
        downloadProgress={downloadProgress}
        isDownloading={isDownloading}
      />
    </>
  );
};

export default UpdateLogModal;
