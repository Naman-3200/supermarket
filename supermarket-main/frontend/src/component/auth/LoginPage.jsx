import { useState } from "react";
import {
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  PhoneIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { API_PATHS, buildApiUrl } from '../../config/apiEndpoints'

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(buildApiUrl(API_PATHS.auth.login), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to login");
        return;
      }

      localStorage.setItem("authUser", JSON.stringify(data.user));
      localStorage.setItem("authToken", data.token);
      if (data.user?.role === "admin") {
        navigate("/admin/dashboard");
      } else if (data.user?.role === "delivery") {
        navigate("/delivery/dashboard");
      } else {
        navigate("/");
      }
    } catch (requestError) {
      setError("Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <div className="w-full lg:w-1/2 flex justify-center items-center">
        <div className="w-full max-w-md px-6 py-10">
          <div className="">
            <div className="flex items-center gap-2">
              <div className="rounded-lg text-white grid place-items-center text-lg font-bold">
                <img
                  src="/assets/logo.png"
                  alt=""
                  className="h-52 w-52 object-contain"
                />
              </div>
              <div className="text-2xl font-semibold tracking-tight">
                Your neighborhood store, online.
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-semibold mb-2 text-left tracking-tight">
            Log in
          </h1>
          <p className="text-gray-500 mb-8 text-left tracking-tight">
            Welcome back. Please sign in to continue.
          </p>

          {error ? (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
              {error}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="text-base font-semibold tracking-tight text-gray-800"
                htmlFor="identifier"
              >
                Email / Phone <span className="text-orange-600">*</span>
              </label>

              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {formData.identifier.includes("@") ? (
                    <EnvelopeIcon size={22} />
                  ) : (
                    <PhoneIcon size={22} />
                  )}
                </span>

                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder="Ex. user@example.com or 9876543210"
                  value={formData.identifier}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-300 pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div>
              <label
                className="text-base font-semibold tracking-tight text-gray-800"
                htmlFor="password"
              >
                Password <span className="text-orange-600">*</span>
              </label>

              <div className="relative mt-1">
                <KeyIcon
                  size={22}
                  weight="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  className="w-full rounded-md border border-gray-300 pl-10 pr-12 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeSlashIcon size={22} weight="regular" />
                  ) : (
                    <EyeIcon size={22} weight="regular" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-[#714b23] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#714b23] hover:bg-orange-600 text-white font-medium py-2.5 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Logging in..." : "Log in"}
            </button>

            <p className="text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="text-[#6cc300] cursor-pointer hover:underline"
              >
                Sign up
              </button>
            </p>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex w-1/2 items-center justify-center bg-orange-50">
        <div className="w-[95%] h-[95%] rounded-2xl overflow-hidden shadow-lg relative">
                <div className="absolute inset-0 bg-black/60" />
          {/* Background Image */}
          <img
            src="https://www.brandbucket.com/ideas_cache_resize_1600/name-ideas/grocery-business-names.jpeg"
            alt="Online grocery illustration"
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />

        <div className="relative z-10 h-full flex items-end p-6 sm:p-8 md:p-10">
            <div className="space-y-2 max-w-sm bg-white/50 p-2 rounded-xl">
              <h2 className="text-black text-base sm:text-lg font-semibold">
               Your{" "}
                <span className="text-black">Go-To Online Store</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#714b23] font-semibold ">
                Experience structured video workflows with real-time feedback,
                version control, and faster delivery cycles.
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
