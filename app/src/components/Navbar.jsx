import React, { useState, useEffect } from "react";
import {
  PanelRight,
  X,
  Pencil,
  Plus,
  Search,
  Edit3,
  User,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { useLiveQuery } from 'dexie-react-hooks';

export default function NavBar({ activeTab, setActiveTab }) {
  const dbPages = useLiveQuery(() => db.pages.toArray(), []);
  const [pages, setPages] = useState([]);
  const [draggedPage, setDraggedPage] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);  
  const [newPageDialog, setNewPageDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newPage, setNewPage] = useState({ title: "" });

  const now = () => new Date().toISOString();

  useEffect(() => {
    if (dbPages && dbPages.length > 0) {
      setPages(dbPages);
      
      if (!activeTab) {
        setActiveTab(dbPages[0].title);
      }
    }
  }, [dbPages, activeTab, setActiveTab]);

  const handleDeletePage = async (pageToDelete) => {
    try {
      const widgets = await db.widgets.where({ pageId: pageToDelete.id }).toArray();
      
      for (const widget of widgets) {
        await db.links.where({ widgetId: widget.id }).delete();
      }
      
      await db.widgets.where({ pageId: pageToDelete.id }).delete();
      await db.pages.delete(pageToDelete.id);
      
      if (activeTab === pageToDelete.title) {
        const remainingPages = dbPages.filter(p => p.id !== pageToDelete.id);
        if (remainingPages.length > 0) {
          setActiveTab(remainingPages[0].title);
        } else {
          setActiveTab("");
        }
      }
      
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete page:", error);
      alert("Error: Failed to delete page");
    }
  };

  const addPage = async () => {
    if (!newPage.title.trim()) {
      alert("Please enter a page title");
      return;
    }
    
    try {
      await db.pages.add({
        uuid: uuidv4(),
        title: newPage.title,
        createdAt: now(),
        updatedAt: now(),
      });

      setActiveTab(newPage.title);
      setNewPage({ title: "" });
      setNewPageDialog(false);
    } catch (error) {
      console.error("Failed to add page:", error);
      alert("Error: Failed to add page");
    }
  };

  // DRAG & DROP HANDLERS
  const handleDragStart = (e, page, index) => {
    setDraggedPage({ page, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedPage(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    
    if (!draggedPage || draggedPage.index === targetIndex) {
      setDraggedPage(null);
      setDragOverIndex(null);
      return;
    }

    const reorderedPages = [...pages];
    const [removed] = reorderedPages.splice(draggedPage.index, 1);
    reorderedPages.splice(targetIndex, 0, removed);

    setPages(reorderedPages);
    setDraggedPage(null);
    setDragOverIndex(null);
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSidebarOpen(false);
        setNewPageDialog(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <>
      <nav className="relative">
        <div className="border border-black">
          <div className="flex items-center justify-between my-1">
            {/* Left side - Pages section */}
            <div className="flex items-center relative">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center p-1 px-3 mx-2 hover:bg-gray-100 transition-colors rounded-md"
                aria-label="Toggle sidebar"
              >
                <PanelRight />
              </button>

              {/* Pages Sidebar */}
              {sidebarOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                  />

                  <div
                    className="fixed top-16 left-2 w-80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl z-40 rounded overflow-hidden"
                    role="dialog"
                    aria-label="Pages sidebar"
                  >
                    <div className="flex items-center justify-between p-4 border-b border-slate-700">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        Pages
                      </h2>

                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg"
                        aria-label="Close sidebar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-2">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Your Pages
                          </p>
                          <button
                            onClick={() => {
                              setSidebarOpen(false);
                              setNewPageDialog(true);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            aria-label="Add new page"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          {pages.map((page) => (
                            <div
                              className="flex items-center justify-between mx-1 group/item"
                              key={page.id}
                            >
                              <button
                                onClick={() => {
                                  setActiveTab(page.title);
                                  setSidebarOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 p-2 my-1 rounded-lg transition-all ${
                                  activeTab === page.title
                                    ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/50"
                                    : "text-gray-300 hover:bg-slate-700"
                                }`}
                                aria-label={`Go to ${page.title}`}
                                aria-current={
                                  activeTab === page.title ? "page" : undefined
                                }
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                                  <span className="font-medium text-sm">
                                    {page.title}
                                  </span>
                                </div>
                              </button>

                              <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Add edit functionality
                                  }}
                                  className="hover:bg-blue-500/20 p-1 rounded transition-colors group/edit"
                                  aria-label={`Edit ${page.title}`}
                                >
                                  <Pencil className="w-4 h-4 text-gray-400 group-hover/edit:text-blue-500 transition-colors" />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(page);
                                  }}
                                  className="hover:bg-red-500/20 p-1 rounded transition-colors group/delete"
                                  aria-label={`Delete ${page.title}`}
                                >
                                  <X className="w-4 h-4 text-gray-400 group-hover/delete:text-red-500 transition-colors" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-slate-700 bg-slate-900">
                      <div className="text-center text-sm text-gray-400">
                        {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TABS - Drag & Drop */}
              <div className="flex items-center space-x-2">
                {pages.slice(0, 5).map((page, index) => {
                  const isDragging = draggedPage?.index === index;
                  const isDropTarget = dragOverIndex === index && draggedPage?.index !== index;

                  return (
                    <div
                      key={page.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, page, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`
                        relative border-2 border-black rounded-lg px-3 py-1 text-sm 
                        transition-all duration-200 cursor-move
                        ${activeTab === page.title 
                          ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/50" 
                          : "text-gray-700 hover:bg-cyan-400 hover:text-white"
                        }
                        ${isDragging ? 'opacity-30 scale-90' : 'opacity-100 scale-100'}
                        ${isDropTarget ? 'ring-2 ring-cyan-400 ring-offset-2' : ''}
                      `}
                    >
                      <button
                        onClick={() => setActiveTab(page.title)}
                        aria-label={`Switch to ${page.title}`}
                        className="w-full"
                      >
                        {page.title}
                      </button>
                    </div>
                  );
                })}
                {pages.length > 5 && (
                  <span className="text-gray-400 text-sm">+{pages.length - 5} more</span>
                )}
              </div>

              <button
                className="mx-3"
                onClick={() => setNewPageDialog(true)}
                aria-label="Add new page"
              >
                <Plus className="w-6 h-6 border-2 border-black rounded-full border-dotted hover:bg-emerald-500 transition-colors p-0.5" />
              </button>
            </div>

            {/* Right side - Search, Edit, Account */}
            <div className="flex items-center space-x-4 mx-3">
              <button 
                onClick={async () => {
                  if (confirm('Delete ALL data and reset database?')) {
                    await db.delete();
                    window.location.reload();
                  }
                }}
                className="bg-red-500 text-white px-3 py-2 rounded text-xs"
              >
                [ Reset DB ]
              </button>

              <button
                onClick={() => setSearchOpen(true)}
                className="hover:bg-gray-100 p-2 rounded-md transition-colors"
                aria-label="Open search"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </button>

              <button
                className="hover:bg-gray-100 p-2 rounded-md transition-colors"
                aria-label="Edit mode"
              >
                <Edit3 className="w-5 h-5 text-gray-700" />
              </button>

              <button
                className="hover:bg-gray-100 p-2 rounded-md transition-colors"
                aria-label="Account settings"
              >
                <User className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSearchOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-96 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center border-b-2 border-gray-300 pb-2">
              <Search className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                autoFocus
                className="ml-3 outline-none text-lg w-full"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Page Dialog */}
      {newPageDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setNewPageDialog(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-96 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Create New Page
              </h2>
              <button
                onClick={() => setNewPageDialog(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Page Title
                </label>
                <input
                  type="text"
                  value={newPage.title}
                  onChange={(e) =>
                    setNewPage({ title: e.target.value })
                  }
                  placeholder="Enter page title (e.g. Work, Personal, etc.)"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPage.title.trim()) {
                      addPage();
                    }
                  }}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setNewPageDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={addPage}
                  className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium shadow-lg shadow-cyan-500/30"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-96 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Delete Page?
              </h3>
              <p className="text-gray-600">
                Are you sure you want to delete "
                <span className="font-semibold">{deleteConfirm.title}</span>"? 
                This will also delete all widgets and links on this page.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePage(deleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}