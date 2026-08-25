import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App Full Render Test', () => {
  it('renders App without crashing and contains SysSim header and components', () => {
    const { container } = render(<App />);
    expect(screen.getByText('SysSim')).toBeDefined();
    expect(screen.getByText('Interactive System Design Simulator')).toBeDefined();
    expect(container.querySelector('#syssim-canvas')).toBeDefined();
  });
});
