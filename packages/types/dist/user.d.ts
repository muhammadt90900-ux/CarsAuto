export declare enum UserRole {
    USER = "USER",
    DEALER = "DEALER",
    ADMIN = "ADMIN"
}
export interface User {
    id: string;
    email: string;
    phone?: string;
    name: string;
    avatar?: string;
    role: UserRole;
    verified: boolean;
    locale: 'ku' | 'ar' | 'en' | 'zh';
    createdAt: Date;
}
export interface Review {
    id: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment: string;
    createdAt: Date;
}
