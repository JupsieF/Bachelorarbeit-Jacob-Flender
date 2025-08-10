'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import AddPlantForm from '@/components/PlantForm';
import { Toaster } from 'sonner';
import AddHeroSection from '@/components/Hero';
import AddListForm from '@/components/ListForm';
import PlantCareList from '@/components/ListPlantCare';

export default function Home() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  }
  
  return (
    <>
      <div className="flex justify-end p-4">
        <Button
          variant="outline"
          className="cursor-pointer text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-800"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>

      <AddHeroSection />
      <div className="mt-8 bg-brand/10 dark:bg-brand/20 rounded-2xl p-6">
        <h1 className="mb-4 text-xl"></h1>
        <p className="text-"></p>
        <div className="flex justify-center items-center space-x-4">
          <AddPlantForm />
          <AddListForm />
          <PlantCareList />
        </div>
      </div>

      <Toaster richColors closeButton />
    </>
  );
}