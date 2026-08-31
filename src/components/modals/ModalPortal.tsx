import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: ReactNode;
}

/** Keeps dialogs outside the application root so background content can be inert. */
export function ModalPortal({ children }: ModalPortalProps) {
  return createPortal(children, document.body);
}
