import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '../components/layout/RootLayout.jsx';
import Home from '../pages/Home.jsx';
import AllTools from '../pages/AllTools.jsx';
import ToolWorkspace from '../pages/ToolWorkspace.jsx';
import About from '../pages/About.jsx';
import Contact from '../pages/Contact.jsx';
import Privacy from '../pages/Privacy.jsx';
import Terms from '../pages/Terms.jsx';
import NotFound from '../pages/NotFound.jsx';

export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'tools', element: <AllTools /> },
      // Direct explicit tool routes for clarity & direct deep links
      { path: 'tools/merge-pdf', element: <ToolWorkspace slugOverride="merge-pdf" /> },
      { path: 'tools/split-pdf', element: <ToolWorkspace slugOverride="split-pdf" /> },
      { path: 'tools/rotate-pdf', element: <ToolWorkspace slugOverride="rotate-pdf" /> },
      { path: 'tools/delete-pages', element: <ToolWorkspace slugOverride="delete-pages" /> },
      { path: 'tools/reorder-pages', element: <ToolWorkspace slugOverride="reorder-pages" /> },
      { path: 'tools/jpg-to-pdf', element: <ToolWorkspace slugOverride="jpg-to-pdf" /> },
      // Parameterized fallback
      { path: 'tools/:slug', element: <ToolWorkspace /> },
      // Informational & Policy Pages
      { path: 'about', element: <About /> },
      { path: 'contact', element: <Contact /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'terms', element: <Terms /> },
      // 404 Catch-All
      { path: '*', element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});
