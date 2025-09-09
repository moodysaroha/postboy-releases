// PostBoy - Core Class
class PostBoy {
  constructor() {
    this.history = [];
    // Theme removed - dark theme only
    this.sidebarStates = JSON.parse(localStorage.getItem('sidebar-states') || '{}');
    this.isDragging = false;
    this.currentDragTarget = null;
    this.dragTargetElement = null; // Cache the DOM element
    this.dragAnimationFrame = null; // For requestAnimationFrame
    this.lastDragEvent = null; // Cache last mouse event
    this.lastResponseData = null; // Store the last response for saving to collections
    this.lastResponseTimestamp = null; // Track when the last response was received
    this.timestampUpdateInterval = null; // Interval for updating timestamp display
    this.currentCollectionRequestId = null; // Track if current request is from a collection
    this.currentCollectionId = null; // Track which collection the request is from
    this.bodyTypeShortcutsEnabled = false; // Track if body type shortcuts are active
    this.bodyTypeShortcutTimeout = null; // Timeout for body type shortcuts
    
    // Tab management
    this.tabs = new Map();
    this.activeTabId = 'new-request';
    this.tabCounter = 1;
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    // Theme setup removed - dark theme only
    await this.loadHistory();
    this.renderHistory();
    this.setupTabs();
    this.setupKeyValuePairs();
    this.setupCollapsibleSidebars();
    this.setupDragResize();
    this.restoreSidebarStates();
    this.setupSidebarTabs();
    this.setupBodyEditor();
    this.updateTabIndicators();
    this.setupShortcutsPopover();
    this.initializeDefaultTab();
    this.setupChangeDetection();
  }
}
