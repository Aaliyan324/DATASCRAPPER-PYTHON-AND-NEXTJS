import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center relative overflow-hidden p-4">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-purple-900/40 border border-purple-400/20">
            A
          </div>
          <span className="font-bold text-lg tracking-wide text-white">
            Aether AI
          </span>
        </div>

        {/* Styled Clerk Component */}
        <SignUp
          appearance={{
            variables: {
              colorPrimary: "#8b5cf6", // Purple-500
              colorBackground: "#161922", // Card dark surface
              colorText: "#f8fafc", // Slate-50 high contrast text
              colorTextSecondary: "#94a3b8", // Slate-400 readable body text
              colorInputBackground: "#0f1117", // Input background
              colorInputText: "#ffffff",
              colorBorder: "#272a37",
              borderRadius: "0.75rem",
            },
            elements: {
              card: "shadow-2xl border border-slate-800/80 bg-[#161922]/90 backdrop-blur-xl",
              headerTitle: "text-slate-100 font-bold",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton: 
                "bg-[#0f1117] border-slate-800 hover:bg-slate-800/50 text-slate-200 transition-all",
              formButtonPrimary: 
                "bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-900/30 border-none transition-all",
              formFieldInput: 
                "border-slate-800 bg-[#0f1117] text-slate-100 focus:border-purple-500 transition-all",
              footerActionLink: "text-purple-400 hover:text-purple-300 font-medium",
              dividerLine: "bg-slate-800",
              dividerText: "text-slate-500",
            },
          }}
        />
      </div>
    </div>
  );
}