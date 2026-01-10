import {
  Html,
  Head,
  Font,
  Preview,
  Heading,
  Row,
  Section,
  Text,
  Button,
  Body,
  Hr,
} from '@react-email/components';

import { Tailwind } from '@react-email/tailwind';
import { Container } from 'lucide-react';

interface VerificationEmailProps {
  name: string;
  email: string;
  password: string;
  role: string;
  companyName: string;
}

export default function OnboardingEmail({name, email, password, role, companyName}: 
  VerificationEmailProps){
    return (
      <Html>
        <Head />
        <Tailwind>
          <Body className="bg-gray-100 font-sans">
            <Container className="mx-auto my-10 max-w-lg rounded-lg bg-white p-8 shadow">
              
              <Heading className="text-2xl font-bold text-gray-900">
                Welcome to {companyName} 🎉
              </Heading>
  
              <Text className="mt-4 text-gray-700">
                Hi <strong>{name}</strong>,
              </Text>
  
              <Text className="text-gray-700">
                Congratulations! You have been hired as a <strong>{role}</strong> at{" "}
                <strong>{companyName}</strong>.
              </Text>
  
              <Text className="text-gray-700">
                Your account has been successfully created. Below are your login
                credentials:
              </Text>
  
              <Section className="mt-6 rounded-md bg-gray-50 p-4">
                <Text className="text-sm text-gray-600">
                  <strong>Email:</strong> {email}
                </Text>
                <Text className="text-sm text-gray-600">
                  <strong>Temporary Password:</strong> {password}
                </Text>
              </Section>
  
              <Text className="mt-4 text-gray-700">
                For security reasons, please log in and change your password
                immediately after your first login.
              </Text>
  
              <Hr className="my-6" />
  
              <Text className="text-gray-700">
                We’re excited to have you onboard and look forward to working
                together. If you have any questions, feel free to reach out to
                your manager or the admin team.
              </Text>
  
              <Text className="mt-6 text-sm text-gray-500">
                — {companyName} Team
              </Text>
  
            </Container>
          </Body>
        </Tailwind>
      </Html>
    );
}