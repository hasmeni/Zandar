import React, { useState } from "react";
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronRight, Grip, AlertTriangle
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";

const Widget = ({ widget, widgets, setWidgets }) => {
  const [showAddLink, setShowAddLink] = useState(false);
  const [editingWidget, setEditingWidget] = useState(false);
  
  const [draggedLink, setDraggedLink] = useState(null);
  const [dragOverLink, setDragOverLink] = useState(null);

  const now = () => new Date().toISOString();

  const [newLink, setNewLink] = useState({
    name: "",
    url: "",
  });

  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const showConfirmDialog = (title, message, onConfirm) =>
    setConfirmDialog({ show: true, title, message, onConfirm });

  const handleConfirm = () => {
    confirmDialog.onConfirm?.();
    closeConfirm();
  };

  const closeConfirm = () =>
    setConfirmDialog({ show: false, title: "", message: "", onConfirm: null });

  // Add Link
  const addLink = async (widgetId) => {
    if (!newLink.name.trim() || !newLink.url.trim()) {
      alert("Please fill in name & URL");
      return;
    }

    let url = newLink.url.trim();
    if (!url.startsWith("http")) url = `https://${url}`;

    // Get max order in widget
    const maxOrder = widget.links.length > 0 
      ? Math.max(...widget.links.map(l => l.order || 0))
      : -1;

    try {
      await db.links.add({
        uuid: uuidv4(),
        name: newLink.name,
        url,
        widgetId,
        order: maxOrder + 1,
        createdAt: now(),
        updatedAt: now(),
      });
    } catch (e) {
      console.error("Failed to add link:", e);
    }

    setNewLink({ name: "", url: "" });
    setShowAddLink(false);
  };

  // Delete Link
  const deleteLink = (id) =>
    showConfirmDialog("Delete Link", "This cannot be undone", () => {
      db.links.delete(id);
    });

  // Delete Widget + all its links
  const deleteWidget = (widgetId) =>
    showConfirmDialog("Delete Widget", "This will delete all links too", async () => {
      const links = await db.links.where({ widgetId }).toArray();
      await Promise.all(links.map((l) => db.links.delete(l.id)));
      await db.widgets.delete(widgetId);
    });

  // Toggle Collapse
  const toggleCollapse = (id, collapsed) =>
    db.widgets.update(id, { collapsed: !collapsed, updatedAt: now() });

  // Update Widget Title
  const updateWidgetTitle = (id, title) => {
    const trimmedTitle = title.trim();
    if (trimmedTitle === "") {
      db.widgets.update(id, { title: "New Widget", updatedAt: now() });
    } else {
      db.widgets.update(id, { title: trimmedTitle, updatedAt: now() });
    }
  };

  // LINK DRAG & DROP HANDLERS

  const handleLinkDragStart = (e, link) => {
    setDraggedLink(link);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("linkId", link.id.toString());
  };

  const handleLinkDragEnd = () => {
    setDraggedLink(null);
    setDragOverLink(null);
  };

  const handleLinkDragOver = (e, targetLink) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedLink || draggedLink.id === targetLink.id) return;
    
    setDragOverLink(targetLink.id);
  };

  const handleLinkDrop = async (e, targetLink) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedLink || draggedLink.id === targetLink.id) return;

    // Check if moving to same widget (reorder) or different widget (move)
    if (draggedLink.widgetId === targetLink.widgetId) {
      // Reorder within same widget
      const widgetLinks = widget.links.sort((a, b) => (a.order || 0) - (b.order || 0));
      const draggedIndex = widgetLinks.findIndex(l => l.id === draggedLink.id);
      const targetIndex = widgetLinks.findIndex(l => l.id === targetLink.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const reordered = [...widgetLinks];
        const [removed] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, removed);
        
        // Update order in database
        const updates = reordered.map((link, index) => 
          db.links.update(link.id, { order: index, updatedAt: now() })
        );
        
        await Promise.all(updates);
      }
    } else {
      // Move to different widget
      const targetWidgetLinks = widgets
        .find(w => w.id === targetLink.widgetId)?.links || [];
      
      const targetIndex = targetWidgetLinks.findIndex(l => l.id === targetLink.id);
      
      await db.links.update(draggedLink.id, {
        widgetId: targetLink.widgetId,
        order: targetIndex,
        updatedAt: now(),
      });
    }
    
    setDraggedLink(null);
    setDragOverLink(null);
  };

  // Drop on widget (when not dropping on a specific link)
  const handleWidgetDrop = async (e) => {
    e.preventDefault();
    
    if (!draggedLink || dragOverLink) return; // Already handled by link drop
    
    // Drop at end of widget
    if (draggedLink.widgetId !== widget.id) {
      const maxOrder = widget.links.length > 0 
        ? Math.max(...widget.links.map(l => l.order || 0))
        : -1;
      
      await db.links.update(draggedLink.id, {
        widgetId: widget.id,
        order: maxOrder + 1,
        updatedAt: now(),
      });
    }
    
    setDraggedLink(null);
  };

  // Sort links by order
  const sortedLinks = [...widget.links].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <>
      {/* Confirm Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 shadow-xl w-80">
            <div className="flex gap-2 items-center text-red-600 mb-3">
              <AlertTriangle size={20} />
              <b>{confirmDialog.title}</b>
            </div>
            <p className="text-sm mb-4">{confirmDialog.message}</p>

            <div className="flex justify-end gap-2">
              <button 
                onClick={closeConfirm} 
                className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm} 
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget Container */}
      <div 
        className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-white hover:border-gray-400 transition-colors group"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleWidgetDrop}
      >
        {/* Header */}
        <div className="flex justify-between mb-3">
          <div className="flex gap-2 items-center flex-1">
            <button onClick={() => toggleCollapse(widget.id, widget.collapsed)}>
              {widget.collapsed ? <ChevronRight size={16}/> : <ChevronDown size={16}/>}
            </button>

            {editingWidget ? (
              <input
                value={widget.title}
                onChange={(e) =>
                  setWidgets(prev =>
                    prev.map(x =>
                      x.id === widget.id ? { ...x, title: e.target.value } : x
                    ))
                }
                onBlur={() => {
                  const w = widgets.find(x => x.id === widget.id);
                  if (w) {
                    updateWidgetTitle(widget.id, w.title);
                  }
                  setEditingWidget(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const w = widgets.find(x => x.id === widget.id);
                    if (w) {
                      updateWidgetTitle(widget.id, w.title);
                    }
                    setEditingWidget(false);
                  }
                  if (e.key === 'Escape') {
                    setEditingWidget(false);
                  }
                }}
                autoFocus
                className="text-sm border border-gray-300 px-2 py-1 rounded flex-1 focus:outline-none focus:border-gray-400"
              />
            ) : (
              <h3 className="text-sm font-semibold">{widget.title}</h3>
            )}
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button 
              onClick={() => setEditingWidget(true)}
              className="hover:bg-gray-100 p-1 rounded"
            >
              <Edit2 size={14}/>
            </button>
            <button 
              onClick={() => deleteWidget(widget.id)}
              className="hover:bg-gray-100 p-1 rounded"
            >
              <Trash2 size={14}/>
            </button>
          </div>
        </div>

        {/* Widget Content */}
        {!widget.collapsed && (
          <div className="space-y-1">
            {sortedLinks.map((l) => {
              const isDragging = draggedLink?.id === l.id;
              const isDropTarget = dragOverLink === l.id;

              return (
                <div 
                  key={l.id}
                  draggable
                  onDragStart={(e) => handleLinkDragStart(e, l)}
                  onDragEnd={handleLinkDragEnd}
                  onDragOver={(e) => handleLinkDragOver(e, l)}
                  onDrop={(e) => handleLinkDrop(e, l)}
                  className={`
                    group/link flex items-center gap-2 px-2 py-1.5 rounded 
                    hover:bg-gray-50 cursor-move transition-all duration-150
                    ${isDragging ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}
                    ${isDropTarget ? 'bg-cyan-50 border-l-2 border-cyan-500' : ''}
                  `}
                >
                  <Grip size={14} className="text-gray-400 opacity-0 group-hover/link:opacity-100"/>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${l.url}&sz=32`}
                    className="w-4 h-4"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                  <a 
                    href={l.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex-1 text-sm truncate hover:text-blue-600"
                  >
                    {l.name}
                  </a>
                  <button 
                    onClick={() => deleteLink(l.id)}
                    className="opacity-0 group-hover/link:opacity-100 hover:bg-gray-200 p-1 rounded"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
              );
            })}

            {showAddLink ? (
              <div className="bg-gray-50 p-2 rounded space-y-2 mt-2">
                <input
                  placeholder="Name"
                  className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:border-gray-400"
                  value={newLink.name}
                  onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                  autoFocus
                />
                <input
                  placeholder="URL"
                  className="w-full border border-gray-300 px-2 py-1 rounded text-sm focus:outline-none focus:border-gray-400"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => addLink(widget.id)} 
                    className="flex-1 bg-black text-white px-3 py-1 rounded text-xs hover:bg-gray-800"
                  >
                    Add
                  </button>
                  <button 
                    onClick={() => { 
                      setShowAddLink(false); 
                      setNewLink({ name: "", url: "" }); 
                    }}
                    className="bg-gray-200 text-xs px-3 py-1 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowAddLink(true)}
                className="w-full text-left text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100"
              > 
                <Plus size={12}/> Add link
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Widget;