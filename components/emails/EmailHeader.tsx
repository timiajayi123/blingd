import React from 'react';
import { Heading, Section, Text } from '@react-email/components';
import { SVGProps } from 'react';

interface EmailHeaderProps {
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  title: string;
  subtitle?: string;
}

export const EmailHeader = ({ icon: Icon, title, subtitle }: EmailHeaderProps) => {
  return (
    <Section className="mb-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-xl mb-4">
          <Icon className="text-white w-6 h-6" />
        </div>
        <Heading as="h1" className="text-2xl font-bold tracking-tight text-black mb-2">
          {title}
        </Heading>
        {subtitle && (
          <Text className="text-zinc-500 text-sm mt-0">
            {subtitle}
          </Text>
        )}
      </div>
    </Section>
  );
};