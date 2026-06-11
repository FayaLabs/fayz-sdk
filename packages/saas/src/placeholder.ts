import React from 'react'

/**
 * Page stub for modules that are planned but not built yet.
 * Usage: { path: '/marketing', label: 'Marketing', icon: 'Megaphone', component: createPlaceholder('Marketing') }
 */
export function createPlaceholder(title: string, description?: string): React.FC {
  return function PlaceholderPage() {
    return React.createElement(
      'div',
      { className: 'mx-auto max-w-4xl' },
      React.createElement('h1', { className: 'text-3xl font-bold text-foreground' }, title),
      description
        ? React.createElement('p', { className: 'mt-1 text-muted-foreground' }, description)
        : null,
      React.createElement(
        'div',
        { className: 'mt-8 flex items-center justify-center rounded-card border border-dashed border-border bg-card p-16' },
        React.createElement(
          'div',
          { className: 'text-center' },
          React.createElement('p', { className: 'text-lg font-medium text-muted-foreground' }, 'Coming Soon'),
          React.createElement(
            'p',
            { className: 'mt-1 text-sm text-muted-foreground/70' },
            'This module is being built as a plugin.',
          ),
        ),
      ),
    )
  }
}
