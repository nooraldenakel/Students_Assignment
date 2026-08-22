import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import Modal from '../components/Modal';
import StoreProvider from '../components/StoreProvider';

export const metadata: Metadata = {
    title: 'Student List Management',
    description: 'Manage students and course assignments',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body className="font-sans bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 antialiased">
                <StoreProvider>
                    <div className="flex h-screen overflow-hidden">
                        <Sidebar />
                        <main className="flex-1 overflow-y-auto w-full p-6 lg:p-8">
                            {children}
                        </main>
                    </div>
                    <Modal />
                </StoreProvider>
            </body>
        </html>
    );
}
