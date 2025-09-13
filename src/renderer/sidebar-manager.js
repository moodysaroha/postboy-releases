// Sidebar Manager Module
PostBoy.prototype.setupCollapsibleSidebars = function() {
  // Setup collapse buttons
  document.querySelectorAll('.collapse-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sidebarId = btn.getAttribute('data-target');
      this.toggleSidebar(sidebarId);
    });
  });

  // Setup expand buttons for collapsed state
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sidebarId = btn.getAttribute('data-target');
      this.toggleSidebar(sidebarId);
    });
  });
};

PostBoy.prototype.toggleSidebar = function(sidebarId) {
  const sidebar = document.getElementById(sidebarId);
  const isCollapsed = sidebar.classList.contains('collapsed');
  
  if (isCollapsed) {
    sidebar.classList.remove('collapsed');
  } else {
    sidebar.classList.add('collapsed');
  }
  
  // Save state
  this.saveSidebarStates();
};

PostBoy.prototype.setupDragResize = function() {
  const dragHandles = document.querySelectorAll('.drag-handle');
  
  dragHandles.forEach(handle => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startDrag(handle, e);
    });
  });

  // Global mouse events for dragging
  document.addEventListener('mousemove', (e) => {
    if (this.isDragging) {
      // Store the event and request animation frame
      this.lastDragEvent = e;
      if (!this.dragAnimationFrame) {
        this.dragAnimationFrame = requestAnimationFrame(() => {
          this.handleDragOptimized();
        });
      }
    }
  }, { passive: true }); // Passive listener for better performance

  document.addEventListener('mouseup', () => {
    this.endDrag();
  });
};

PostBoy.prototype.startDrag = function(handle, event) {
  this.isDragging = true;
  this.currentDragTarget = handle.getAttribute('data-target');
  this.dragTargetElement = document.getElementById(this.currentDragTarget);
  
  // Store initial state for calculations
  this.startX = event.clientX;
  this.startWidth = this.dragTargetElement.offsetWidth;
  
  // Add dragging classes and cursor
  handle.classList.add('dragging');
  this.dragTargetElement.classList.add('dragging');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  
  // Add will-change for GPU acceleration
  this.dragTargetElement.style.willChange = 'width';
  
  event.preventDefault();
};

PostBoy.prototype.handleDragOptimized = function() {
  if (!this.isDragging || !this.lastDragEvent || !this.dragTargetElement) {
    this.dragAnimationFrame = null;
    return;
  }
  
  const deltaX = this.lastDragEvent.clientX - this.startX;
  
  let newWidth;
  if (this.currentDragTarget === 'left-sidebar') {
    newWidth = this.startWidth + deltaX;
  } else if (this.currentDragTarget === 'right-sidebar') {
    newWidth = this.startWidth - deltaX;
  }
  
  // Apply constraints
  newWidth = Math.max(200, Math.min(600, newWidth));
  
  // Update width
  this.dragTargetElement.style.width = newWidth + 'px';
  
  // Clear the animation frame
  this.dragAnimationFrame = null;
};

PostBoy.prototype.endDrag = function() {
  if (!this.isDragging) return;
  
  // Cancel any pending animation frame
  if (this.dragAnimationFrame) {
    cancelAnimationFrame(this.dragAnimationFrame);
    this.dragAnimationFrame = null;
  }
  
  this.isDragging = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  
  // Remove dragging class from all handles
  document.querySelectorAll('.drag-handle').forEach(handle => {
    handle.classList.remove('dragging');
  });
  
  // Clean up GPU acceleration hint and dragging class
  if (this.dragTargetElement) {
    this.dragTargetElement.style.willChange = 'auto';
    this.dragTargetElement.classList.remove('dragging');
  }
  
  this.saveSidebarStates();
  
  this.currentDragTarget = null;
  this.dragTargetElement = null;
  this.lastDragEvent = null;
  this.startX = null;
  this.startWidth = null;
};

PostBoy.prototype.restoreSidebarStates = function() {
  Object.entries(this.sidebarStates).forEach(([sidebarId, state]) => {
    const sidebar = document.getElementById(sidebarId);
    if (sidebar && state) {
      if (state.width) {
        sidebar.style.width = state.width;
      }
      if (state.collapsed) {
        sidebar.classList.add('collapsed');
      }
    }
  });
};

PostBoy.prototype.saveSidebarStates = function() {
  const sidebars = ['left-sidebar', 'right-sidebar'];
  
  sidebars.forEach(sidebarId => {
    const sidebar = document.getElementById(sidebarId);
    if (sidebar) {
      this.sidebarStates[sidebarId] = {
        width: sidebar.style.width || sidebar.offsetWidth + 'px',
        collapsed: sidebar.classList.contains('collapsed')
      };
    }
  });
  
  localStorage.setItem('sidebar-states', JSON.stringify(this.sidebarStates));
};

PostBoy.prototype.setupSidebarTabs = function() {
  // Sidebar tab buttons
  document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      this.switchSidebarTab(tabName);
    });
  });
};

PostBoy.prototype.switchSidebarTab = function(tabName) {
  // Remove active class from all sidebar tabs
  document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Hide all sidebar tab panes
  document.querySelectorAll('.sidebar-tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  
  // Activate clicked tab
  const tabButton = document.querySelector(`.sidebar-tab-btn[data-tab="${tabName}"]`);
  const tabPane = document.getElementById(`${tabName}-tab`);
  
  if (tabButton) tabButton.classList.add('active');
  if (tabPane) tabPane.classList.add('active');
};
