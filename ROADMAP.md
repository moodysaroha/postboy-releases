# PostBoy Development Roadmap

## Project Overview
**PostBoy** is a minimal API testing tool built with Electron, designed to provide a lightweight alternative to Postman. The application focuses on simplicity, performance, and essential API testing features.

**Current Version:** 0.0.24  
**Repository:** https://github.com/moodysaroha/postboy  
**Last Updated:** September 2025

---

## 🎯 Current Status Summary

| Category | Total | Completed | In Progress | Pending |
|----------|-------|-----------|-------------|---------|
| **Core Features** | 8 | 6 | 2 | 0 |
| **UI/UX Improvements** | 6 | 1 | 1 | 4 |
| **Testing & Quality** | 2 | 2 | 0 | 0 |
| **Advanced Features** | 20 | 0 | 0 | 20 |
| **Chatbot Integration** | 2 | 0 | 1 | 1 |
| **Authentication & Security** | 2 | 0 | 1 | 1 |

**Overall Progress:** 9/40 tasks completed (22.5%)

---

## ✅ Completed Features

### Core Functionality
- **✅ Curl Support** - Full curl command import and execution
- **✅ Import Collections** - Support for Postman 2.1 schema and custom PostBoy schema
- **✅ Export Collections** - Export collections in multiple formats
- **✅ New Request Creation** - Intuitive request builder interface
- **✅ Request Saving** - Save requests with Ctrl+S shortcut
- **✅ Keyboard Shortcuts** - Essential shortcuts for improved productivity

### Testing Infrastructure
- **✅ Body Type Support** - Support for all major request body types (JSON, form-data, raw, etc.)
- **✅ Automated Testing Framework** - Comprehensive test suite (see `tests/README.md`)

---

## 🚧 Work In Progress

### UI/UX Enhancements
- **🔄 UI Improvements** - General interface refinements and modernization
- **🔄 React + Vite Migration** - Porting from vanilla JavaScript to React with Vite build system

### Authentication & User Management
- **🔄 User Login/Registration** - User account system implementation

### AI Integration
- **🔄 Chatbot Integration** - Separate Python API for AI-powered assistance (Assignee: Abhishek)

---

## 📋 Planned Features

### High Priority (Q4 2025)

#### Response Panel Improvements
- **Response HTML Formatting** - Format, highlight, and colorize HTML responses
- **Line Number Alignment** - Fix line number display and add expand/collapse functionality

#### UI/UX Enhancements
- **Chatbot UI Integration** - Embed chatbot interface within the main application
- **Token/API Key Visibility Toggle** - Eye icon to show/hide sensitive values
- **JSON Diff Tool** - Compare JSON responses (similar to Beyond Compare)

#### Security Features
- **Role-Based Access Control (RBAC)** - User permission management system

### Medium Priority (Q1 2026)

#### Advanced Testing Features
- **Swagger Test Generation** - Automatically generate test cases from Swagger/OpenAPI schemas
- **Collection Runner** - Execute all requests in a collection sequentially
- **Attack Simulation** - Basic fuzz testing with malicious payload injection (SQLi, XSS)

#### Developer Experience
- **Auto Code Generation** - Generate sample code in major programming languages
- **Request Chaining** - Let responses automatically feed into subsequent requests
- **Global Search** - Search across all collections, requests, and response history

#### Data & Analytics
- **Response Heatmaps** - Visualize JSON changes between requests
- **Auto Rate-Limiting Tests** - Stress test endpoints to identify throttling limits

### Low Priority (Q2 2026)

#### Advanced Features
- **JSON Natural Language Search** - Query JSON responses using plain English
- **Mock Data Generation** - Generate fake payloads (names, emails, images) with faker engine
- **Interactive Data Visualization** - Convert JSON into tables or charts automatically
- **Offline API Replay** - Cache responses for offline development

#### Collaboration Features
- **Interactive Documentation Generator** - Convert collections into shareable documentation
- **Real-Time Pair Testing** - Collaborative request editing (requires cloud sync)

#### Experimental Features
- **QR Code Sharing** - Convert requests to QR codes for quick sharing
- **Voice-Controlled Requests** - Voice commands for API testing
- **Request-to-Curl QR Code** - Generate QR codes from curl commands

---

## 🏗️ Technical Architecture

### Current Stack
- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Backend:** Electron (Node.js)
- **Database:** SQLite (better-sqlite3)
- **Build System:** Electron Forge
- **Testing:** Custom Playwright-based framework

### Planned Migration
- **Frontend:** React + TypeScript + Vite
- **State Management:** Redux Toolkit or Zustand
- **UI Components:** Custom component library
- **Testing:** Jest + React Testing Library

---

## 🎯 Milestones & Timeline

### Milestone 1: Core Stability (Q4 2025)
**Target:** December 2025
- Complete React migration
- Implement response panel improvements
- Add basic RBAC system
- Release v1.0.0

### Milestone 2: Advanced Testing (Q1 2026)
**Target:** March 2026
- Swagger integration
- Collection runner
- Attack simulation features
- Enhanced UI/UX

### Milestone 3: AI & Collaboration (Q2 2026)
**Target:** June 2026
- Full chatbot integration
- Interactive documentation
- Advanced search capabilities
- Real-time collaboration features

### Milestone 4: Enterprise Features (Q3 2026)
**Target:** September 2026
- Advanced analytics
- Enterprise security features
- Cloud sync capabilities
- Mobile companion app

---

## 🔧 Development Guidelines

### Code Quality Standards
- **Testing:** Maintain >80% code coverage
- **Documentation:** All public APIs must be documented
- **Performance:** Response time <100ms for UI interactions
- **Security:** Regular security audits for sensitive features

### Contribution Workflow
1. Feature planning and design review
2. Implementation with unit tests
3. Integration testing
4. Code review and approval
5. Deployment and monitoring

### Release Strategy
- **Major releases:** Quarterly (new features)
- **Minor releases:** Monthly (improvements, bug fixes)
- **Patch releases:** As needed (critical fixes)

---

## 📊 Success Metrics

### User Experience
- **App Launch Time:** <3 seconds
- **Request Response Time:** <500ms average
- **UI Responsiveness:** 60fps animations
- **Crash Rate:** <0.1%

### Feature Adoption
- **Collection Usage:** >70% of users create collections
- **Export/Import:** >50% of users utilize import/export
- **Advanced Features:** >30% adoption rate for new features

### Performance Benchmarks
- **Memory Usage:** <200MB average
- **CPU Usage:** <5% idle, <20% under load
- **Storage:** <100MB application size

---

## 🤝 Contributing

### Current Team
- **Lead Developer:** Gaurav Saroha (Moody's)
- **AI Integration:** Abhishek
- **Community Contributors:** Welcome!

### How to Contribute
1. Check the roadmap for available tasks
2. Join our development discussions
3. Submit feature requests and bug reports
4. Contribute code via pull requests

### Development Setup
```bash
# Clone the repository
git clone https://github.com/moodysaroha/postboy.git

# Install dependencies
yarn install

# Start development server
yarn start

# Run tests
cd tests && yarn test
```

---

## 📞 Contact & Support

- **GitHub Issues:** https://github.com/moodysaroha/postboy/issues
- **Email:** gaurav@example.com
- **Documentation:** See `Docs/` directory

---

*This roadmap is a living document and will be updated regularly based on user feedback, technical constraints, and market demands.*
