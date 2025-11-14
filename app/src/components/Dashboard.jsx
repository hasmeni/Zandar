import React, { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import Widget from "./Widgets";

const Dashboard = ({ activePage = "Home" }) => {
  const dbWidgets = useLiveQuery(() => db.widgets.toArray(), []);
  const dbLinks = useLiveQuery(() => db.links.toArray(), []);
  const dbPages = useLiveQuery(() => db.pages.toArray(), []);

  const [widgets, setWidgets] = useState([]);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [dragOverWidget, setDragOverWidget] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dropPosition, setDropPosition] = useState(null);

  const now = () => new Date().toISOString();

  const getCurrentPageId = useCallback(() => {
    if (!dbPages || !activePage) return null;
    const page = dbPages.find(p => p.title === activePage);
    return page ? page.id : null;
  }, [dbPages, activePage]);

  useEffect(() => {
    if (dbWidgets && dbLinks && dbPages) {
      const currentPageId = getCurrentPageId();
      
      if (!currentPageId) {
        setWidgets([]);
        return;
      }

      const pageWidgets = dbWidgets.filter(widget => widget.pageId === currentPageId);
      
      const data = pageWidgets.map((widget) => ({
        ...widget,
        links: dbLinks.filter((link) => link.widgetId === widget.id),
      }));
      
      setWidgets(data);
    }
  }, [dbWidgets, dbLinks, dbPages, activePage, getCurrentPageId]);

  const getWidgetsByColumn = (columnId) => {
    return widgets
      .filter(widget => (widget.columnId || 1) === columnId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  const addWidget = async (columnId) => {
    const currentPageId = getCurrentPageId();

    if (!currentPageId) {
      alert("Please select a page first");
      return;
    }

    const columnWidgets = getWidgetsByColumn(columnId);
    const maxOrder = columnWidgets.length > 0 
      ? Math.max(...columnWidgets.map(w => w.order || 0))
      : -1;

    await db.widgets.add({
      uuid: uuidv4(),
      title: "New Widget",
      collapsed: false,
      pageId: currentPageId,
      columnId: columnId || 1,
      order: maxOrder + 1,
      createdAt: now(),
      updatedAt: now(),
    });
  };

  // DRAG & DROP HANDLERS
  
  const handleWidgetDragStart = (e, widget) => {
    setDraggedWidget(widget);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("widgetId", widget.id.toString());
  };

  const handleWidgetDragEnd = () => {
    setDraggedWidget(null);
    setDragOverWidget(null);
    setDragOverColumn(null);
    setDropPosition(null);
  };

  const handleColumnDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleWidgetDragOver = (e, targetWidget) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedWidget || draggedWidget.id === targetWidget.id) return;
    
    // Calculate position (above or below)
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const widgetMiddle = rect.top + rect.height / 2;
    const position = mouseY < widgetMiddle ? 'above' : 'below';
    
    setDragOverWidget(targetWidget.id);
    setDropPosition(position);
  };

  const handleWidgetDrop = async (e, targetWidget) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedWidget || draggedWidget.id === targetWidget.id) return;
    
    const targetColumnId = targetWidget.columnId;
    const columnWidgets = getWidgetsByColumn(targetColumnId);
    
    // Remove dragged widget from current position
    const filteredWidgets = columnWidgets.filter(w => w.id !== draggedWidget.id);
    
    // Find target index
    const targetIndex = filteredWidgets.findIndex(w => w.id === targetWidget.id);
    
    // Insert based on drop position
    const newIndex = dropPosition === 'above' ? targetIndex : targetIndex + 1;
    filteredWidgets.splice(newIndex, 0, draggedWidget);
    
    // Update all widgets in column
    const updates = filteredWidgets.map((widget, index) => {
      return db.widgets.update(widget.id, {
        columnId: targetColumnId,
        order: index,
        updatedAt: now(),
      });
    });
    
    await Promise.all(updates);
    
    setDraggedWidget(null);
    setDragOverWidget(null);
    setDragOverColumn(null);
    setDropPosition(null);
  };

  const handleColumnDrop = async (e, targetColumnId) => {
    e.preventDefault();
    
    if (!draggedWidget) return;
    
    // Drop on empty space in column
    if (!dragOverWidget) {
      const columnWidgets = getWidgetsByColumn(targetColumnId);
      const maxOrder = columnWidgets.length > 0 
        ? Math.max(...columnWidgets.map(w => w.order || 0))
        : -1;

      await db.widgets.update(draggedWidget.id, {
        columnId: targetColumnId,
        order: maxOrder + 1,
        updatedAt: now(),
      });
    }
    
    setDraggedWidget(null);
    setDragOverWidget(null);
    setDragOverColumn(null);
    setDropPosition(null);
  };

  if (!dbPages) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-xl mb-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Debug info */}
      <div className="max-w-full mx-auto mb-4 text-xs text-gray-500">
        <p>Active Page: {activePage} | Page ID: {getCurrentPageId()} | Widgets: {widgets.length}</p>
      </div>

      <div className="grid grid-cols-3 gap-6 max-w-full mx-auto">
        {widgets.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="mb-2 text-lg">No widgets on this page yet</p>
            <p className="text-sm mb-6">Click "Add Widget" to get started</p>
            <button 
              onClick={() => addWidget(1)}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex flex-col items-center justify-center gap-3 min-h-[200px] min-w-[300px] transition-colors"
            >
              <Plus size={40}/>
              <span className="font-medium text-lg">Add Widget</span>
            </button>
          </div>
        ) : (
          <>
            {[1, 2, 3].map((columnId) => {
              const isColumnHovered = dragOverColumn === columnId;
              const columnWidgets = getWidgetsByColumn(columnId);

              return (
                <div 
                  key={columnId} 
                  className={`min-h-[500px] p-3 rounded-xl transition-all duration-300 ${
                    isColumnHovered 
                      ? 'bg-gradient-to-b from-cyan-50 to-blue-50 ring-2 ring-cyan-400 ring-offset-2 shadow-xl' 
                      : 'bg-gray-50/50'
                  }`}
                  onDragOver={(e) => handleColumnDragOver(e, columnId)}
                  onDrop={(e) => handleColumnDrop(e, columnId)}
                  onDragLeave={() => setDragOverColumn(null)}
                >
                  

                  {/* Widgets */}
                  <div className="space-y-3 mb-4">
                    {columnWidgets.map((widget) => {
                      const isDragging = draggedWidget?.id === widget.id;
                      const isDropTarget = dragOverWidget === widget.id;
                      const showAboveLine = isDropTarget && dropPosition === 'above';
                      const showBelowLine = isDropTarget && dropPosition === 'below';

                      return (
                        <div key={widget.id} className="relative">
                          {/* Drop indicator ABOVE */}
                          {showAboveLine && (
                            <div className="absolute -top-2 left-0 right-0 h-1 bg-cyan-500 rounded-full shadow-lg shadow-cyan-500/50" />
                          )}

                          <div
                            draggable
                            onDragStart={(e) => handleWidgetDragStart(e, widget)}
                            onDragEnd={handleWidgetDragEnd}
                            onDragOver={(e) => handleWidgetDragOver(e, widget)}
                            onDrop={(e) => handleWidgetDrop(e, widget)}
                            className={`
                              cursor-move transition-all duration-200 
                              ${isDragging 
                                ? 'opacity-30 scale-95' 
                                : 'opacity-100 scale-100 hover:scale-102'
                              }
                            `}
                          >
                            <Widget
                              widget={widget}
                              widgets={widgets}
                              setWidgets={setWidgets}
                            />
                          </div>

                          {/* Drop indicator BELOW */}
                          {showBelowLine && (
                            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-cyan-500 rounded-full shadow-lg shadow-cyan-500/50" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Widget Button */}
                  <button 
                    onClick={() => addWidget(columnId)}
                    className={`
                      w-full flex items-center justify-center gap-2 
                      p-3 rounded-lg font-medium transition-all duration-200
                      ${isColumnHovered
                        ? 'bg-cyan-500 text-white shadow-lg scale-105'
                        : 'bg-white border-2 border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Plus size={20}/>
                    <span>Add Widget</span>
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;