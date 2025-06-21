# Claude Code Monitor

VS Code extension for monitoring Claude Code token usage and burn rates.

## Features

- Real-time token tracking with 3-second updates
- Minimal monospace interface
- Burn rate analysis and limit predictions
- Support for Claude Pro, Max 5, and Max 20 plans
- Status bar integration with detailed panel view
- Configurable warning thresholds

## Requirements

Requires `ccusage` command-line tool (part of Claude CLI setup).

## Configuration

- `ccm.refreshInterval` - Update interval in seconds (default: 3)
- `ccm.planType` - Plan type: pro, max5, max20
- `ccm.resetHour` - Reset hour 0-23 UTC (default: 0)
- `ccm.showInStatusBar` - Show in status bar (default: true)
- `ccm.warnThreshold` - Warning threshold 0.1-1.0 (default: 0.8)

## Commands

- Show Claude Usage - Open detailed panel
- Refresh Usage Data - Manual refresh
- Open Settings - Extension settings

## Usage

1. Install extension
2. Configure `ccusage` CLI tool
3. View usage in status bar or detailed panel

Status bar displays current usage vs limit with color-coded warnings. Click for detailed view with burn rate analysis, session blocks, and reset times.

## Troubleshooting

If showing errors:
- Verify `ccusage` in PATH
- Check Claude CLI authentication
- Confirm network connectivity
- Try manual refresh

Based on [Claude Code Usage Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor).