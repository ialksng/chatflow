import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import AuthImage from "../components/AuthImage";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import logo from "../assets/logo-auth.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resetInfo, setResetInfo] = useState(null);
  const { forgotPassword, isRequestingReset } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    const data = await forgotPassword(email);
    if (data) {
      setSubmitted(true);
      setResetInfo(data);
    }
  };

  return (
    <div className="min-h-screen pt-16 grid lg:grid-cols-2">
      {/* Left Side */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <img src={logo} alt="ChatFlow" className="size-8 object-contain" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Reset Password</h1>
              <p className="text-base-content/60">
                Enter your email address and we will generate a password reset link for you.
              </p>
            </div>
          </div>

          {submitted ? (
            <div className="card bg-base-200 border border-base-300 p-6 space-y-4 text-center">
              <div className="flex justify-center text-success">
                <CheckCircle2 className="size-12" />
              </div>
              <h3 className="text-lg font-semibold">Request Received</h3>
              <p className="text-sm text-base-content/70">
                If an account exists for <span className="font-medium text-base-content">{email}</span>, a reset token has been created.
              </p>
              {resetInfo?.resetUrl && (
                <div className="mt-4 p-3 bg-base-100 rounded-lg text-left text-xs break-all border border-base-300">
                  <span className="font-semibold block mb-1 text-primary">Direct Reset Link:</span>
                  <a href={resetInfo.resetUrl} className="link link-primary">
                    {resetInfo.resetUrl}
                  </a>
                </div>
              )}
              <Link to="/login" className="btn btn-primary btn-outline w-full mt-2">
                Return to Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Account Email</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-base-content/40" />
                  </div>
                  <input
                    type="email"
                    className="input input-bordered w-full pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isRequestingReset || !email}
              >
                {isRequestingReset ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Generate Reset Link"
                )}
              </button>
            </form>
          )}

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-base-content/60 hover:text-primary transition-colors"
            >
              <ArrowLeft className="size-4" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <AuthImage type="login" />
    </div>
  );
}

