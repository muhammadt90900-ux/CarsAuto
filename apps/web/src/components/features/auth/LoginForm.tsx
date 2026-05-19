// apps/web/src/components/features/auth/LoginForm.tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@auto-bazaar-pro/ui/components';
import Link from 'next/link';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: any) => {
    // call auth API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
      <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
      <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
      <Button type="submit" className="w-full" variant="accent">Login</Button>
      <p className="text-center text-sm">
        Don't have an account? <Link href="/register" className="text-[#e94560]">Register</Link>
      </p>
    </form>
  );
}
