'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// @ts-ignore
import { Button, Input } from '@auto-bazaar-pro/ui/components';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export default function RegisterPage() {
  const { register: registerUser } = useAuthStore();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  });

  const onSubmit = async (data: any) => {
    await registerUser(data);
    router.push('/dashboard' as any);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto mt-20 p-8">
      <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
      <Input label="Name" {...register('name')} error={errors.name?.message} />
      <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
      <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
      <Input label="Phone" {...register('phone')} error={errors.phone?.message} />
      <Button type="submit" className="w-full" variant="accent">Register</Button>
      <p className="text-center text-sm">
        Already have an account? <Link href="/login" className="text-[#e94560]">Login</Link>
      </p>
    </form>
  );
}
