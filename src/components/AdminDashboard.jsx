"use client"

import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import DirectoryManager from "./DirectoryManager"
import MediaUploader from "./MediaUploader"
import MediaGallery from "./MediaGallery"
import "../styles/Dashboard.css"

function AdminDashboard({ user }) {
  const [directories, setDirectories] = useState([])
  const [currentDirectory, setCurrentDirectory] = useState(null)
  const [images, setImages] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("images")

  useEffect(() => {
    fetchDirectories()
  }, [])

  useEffect(() => {
    if (currentDirectory) {
      fetchImages(currentDirectory.id)
      fetchVideos(currentDirectory.id)
    } else {
      setImages([])
      setVideos([])
    }
  }, [currentDirectory])

  async function fetchDirectories() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("directories").select("*").order("name")

      if (error) {
        throw error
      }

      setDirectories(data || [])
    } catch (error) {
      console.error("Erro ao buscar diretórios:", error.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchImages(directoryId) {
    try {
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .eq("directory_id", directoryId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setImages(data || [])
    } catch (error) {
      console.error("Erro ao buscar imagens:", error.message)
    }
  }

  async function fetchVideos(directoryId) {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("directory_id", directoryId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setVideos(data || [])
    } catch (error) {
      console.error("Erro ao buscar vídeos:", error.message)
    }
  }

  async function handleDirectoryCreated(newDirectory) {
    setDirectories([...directories, newDirectory])
  }

  async function handleDirectoryDeleted(id) {
    setDirectories(directories.filter((dir) => dir.id !== id))
    if (currentDirectory && currentDirectory.id === id) {
      setCurrentDirectory(null)
    }
  }

  async function handleMediaUploaded(newMedia, type) {
    if (type === "image") {
      setImages([newMedia, ...images])
    } else if (type === "video") {
      setVideos([newMedia, ...videos])
    }
  }

  async function handleMediaDeleted(id, type) {
    if (type === "image") {
      setImages(images.filter((img) => img.id !== id))
    } else if (type === "video") {
      setVideos(videos.filter((vid) => vid.id !== id))
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-sidebar">
        <DirectoryManager
          directories={directories}
          currentDirectory={currentDirectory}
          setCurrentDirectory={setCurrentDirectory}
          onDirectoryCreated={handleDirectoryCreated}
          onDirectoryDeleted={handleDirectoryDeleted}
        />
      </div>

      <div className="dashboard-content">
        {currentDirectory ? (
          <>
            <h2>Diretório: {currentDirectory.name}</h2>
            <MediaUploader directoryId={currentDirectory.id} onMediaUploaded={handleMediaUploaded} />

            <div className="media-tabs">
              <button
                className={`tab-btn ${activeTab === "images" ? "active" : ""}`}
                onClick={() => setActiveTab("images")}
              >
                Imagens ({images.length})
              </button>
              <button
                className={`tab-btn ${activeTab === "videos" ? "active" : ""}`}
                onClick={() => setActiveTab("videos")}
              >
                Vídeos ({videos.length})
              </button>
            </div>

            <MediaGallery
              media={activeTab === "images" ? images : videos}
              mediaType={activeTab}
              isAdmin={true}
              onMediaDeleted={handleMediaDeleted}
              userId={user.id}
            />
          </>
        ) : (
          <div className="select-directory-message">
            <h2>Selecione ou crie um diretório para gerenciar mídias</h2>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
