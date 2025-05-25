"use client"

import { useEffect } from "react"
import "../styles/UploadSuccessModal.css"

function UploadSuccessModal({ media, mediaType, onClose }) {
   return (
    <div className="upload-success-overlay">
      <div className="upload-success-modal">
        <div className="success-icon">✅</div>

        <h3>Upload Concluído!</h3>

        <div className="success-details">
          <p>
            {mediaType === "image" ? "Imagem" : "Vídeo"} carregad{mediaType === "image" ? "a" : "o"} com sucesso!
          </p>

          <div className="media-preview">
            {mediaType === "image" ? (
              <img src={media.url || "/placeholder.svg"} alt={media.title} />
            ) : (
              <video controls>
                <source src={media.url} type={media.type} />
              </video>
            )}
          </div>

          <div className="media-info">
            <strong>{media.title}</strong>
            {media.description && <p>{media.description}</p>}
          </div>
        </div>

        <button className="close-btn" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}

export default UploadSuccessModal
