import LandingPage from '@/components/landing/LandingPage';

export const metadata = {
  title: 'Test Portal — Professional Online Assessment Platform',
  description:
    'Distraction-free, mobile and desktop friendly professional test portal with bcrypt token authentication, loss-proof state engine, and real-time proctoring.',
};

export default function Home() {
  return (
    <main className="w-full min-h-screen">
      <LandingPage />
    </main>
  );
}
