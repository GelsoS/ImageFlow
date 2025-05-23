"use client"

import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import ImageGallery from "./ImageGallery"
import "../styles/Dashboard.css"

function UserDashboard({ user }) {
  const [directories, setDirectories] = useState([])
  const [currentDirectory, setCurrentDirectory] = useState(null)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDirectories()
  }, [])

  useEffect(() => {
    if (currentDirectory) {
      fetchImages(currentDirectory.id)
    } else {
      setImages([])
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
      setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-sidebar">
        <h3>Diretórios</h3>
        <div className="directory-list">
          {directories.map((dir) => (
            <div
              key={dir.id}
              className={`directory-item ${currentDirectory?.id === dir.id ? "active" : ""}`}
              onClick={() => setCurrentDirectory(dir)}
            >
              {dir.name}
            </div>
          ))}

          {directories.length === 0 && <p className="no-directories">Nenhum diretório disponível</p>}
        </div>
      </div>

      <div className="dashboard-content">
        {currentDirectory ? (
          <>
            <h2>Diretório: {currentDirectory.name}</h2>
            <ImageGallery images={images} isAdmin={false} />
          </>
        ) : (
          <div className="select-directory-message">
            <h2>Selecione um diretório para visualizar imagens</h2>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserDashboard
