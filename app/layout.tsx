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
                <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body className="font-lexend">
                <StoreProvider>
                    <div className="flex h-screen bg-background overflow-hidden">
                        <Sidebar />
                        <main className="flex-1 overflow-y-auto w-full p-6">
                            {children}
                        </main>
                    </div>
                    <Modal />
                </StoreProvider>
            </body>
        </html>
    );
}
