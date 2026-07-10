/// <reference types="vite/client" />

import React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-button': any;
      'md-outlined-button': any;
      'md-outlined-text-field': any;
      'md-checkbox': any;
      'md-switch': any;
      'md-ripple': any;
    }
  }
}


