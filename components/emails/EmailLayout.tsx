import React from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
} from '@react-email/components';

import { Tailwind } from '@react-email/tailwind';

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export const EmailLayout = ({ previewText, children }: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-zinc-50 my-auto mx-auto font-sans">
          <Container className="max-w-[580px] mx-auto p-4 sm:p-8">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};