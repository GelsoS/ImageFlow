"use client"

import "../styles/UploadProgress.css"

function UploadProgress({ progress, fileName, fileSize, mediaType }) {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="upload-progress-container">
      <div className="upload-info">
        <div className="file-info">
          <span className="file-icon">{mediaType === "image" ? "🖼️" : "🎥"}</span>
          <div className="file-details">
            <div className="file-name">{fileName}</div>
            <div className="file-size">{formatFileSize(fileSize)}</div>
          </div>
        </div>
        <div className="progress-percentage">{progress}%</div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="upload-status">
        {progress < 100 ? (
          <span className="uploading">Carregando...</span>
        ) : (
          <span className="processing">Processando...</span>
        )}
      </div>
    </div>
  )
}

export default UploadProgress
