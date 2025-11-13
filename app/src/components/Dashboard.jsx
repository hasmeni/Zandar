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

  const now = () => new Date().toISOString();

  // Get the current page ID from the page title (memoized)
  const getCurrentPageId = useCallback(() => {
    if (!dbPages || !activePage) return null;
    const page = dbPages.find(p => p.title === activePage);
    return page ? page.id : null;
  }, [dbPages, activePage]);

  // Filter widgets by current page ID
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

  const getWidgetsByColumn = (columnid) => {
    return widgets.filter(widget => (widget.columnId || 1) === columnid);
  }

  // Add Widget to specific column
  const addWidget = async (columnId) => {
    const currentPageId = getCurrentPageId();

    if (!currentPageId) {
      alert("Please select a page first");
      return;
    }

    await db.widgets.add({
      uuid: uuidv4(),
      title: "New Widget",
      collapsed: false,
      pageId: currentPageId,
      columnId: columnId || 1,
      createdAt: now(),
      updatedAt: now(),
    });
  };

  // Show loading state
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
      {/* Debug info - remove later*/}
      <div className="max-w-full mx-auto mb-4 text-xs text-black">
        <p>Active Page: {activePage} | Page ID: {getCurrentPageId()} | Widgets: {widgets.length}</p>
      </div>

      <div className="grid grid-cols-3 gap-6 max-w-full mx-auto">
        {/* Empty state OR widgets */}
        {widgets.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="mb-2 text-lg">No widgets on this page yet</p>
            <p className="text-sm mb-6">Click "Add Widget" to get started</p>
            <button 
              onClick={addWidget}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-gray-400 hover:text-gray-700 hover:bg-gray-50 flex flex-col items-center justify-center gap-3 min-h-[200px] min-w-[300px] transition-colors"
            >
              <Plus size={40}/>
              <span className="font-medium text-lg">Add Widget</span>
            </button>
          </div>
        ) : (
          <>
            {[1, 2, 3].map((columnId) => (
                <div 
                  key={columnId} 
                  className="min-h-[500px] space-y-4"
                >
                  {getWidgetsByColumn(columnId).map((widget) => (
                    <div
                      key={widget.id}
                    >
                      <Widget
                        widget={widget}
                        widgets={widgets}
                        setWidgets={setWidgets}
                      />
                    </div>
                  ))}

                  <button 
                    onClick={() => addWidget(columnId)}
                    className="flex items-center justify-center gap-2 bg-gray-400 p-1 px-2 rounded rounded-md hover:bg-[#1c1c1c] hover:text-white transition-colors"
                  >
                    <Plus size={20}/>
                    <span className="font-medium">Add Widget</span>
                  </button>
                </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;