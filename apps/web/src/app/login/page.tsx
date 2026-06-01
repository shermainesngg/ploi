import LoginForm from '@/components/LoginForm'

export const metadata = {
  title: 'Log in — PLOI',
}

export default function LoginPage() {
  // One unified sign-in. We no longer ask whether you're a creator or a business —
  // the account's email already tells us which dashboard(s) you own.
  return (
    <LoginForm
      heading="Welcome back"
      subcopy="Sign in to your PLOI account."
      signupHref="/signup"
      signupLabel="Get started"
    />
  )
}
