import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center relative overflow-hidden p-4">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-purple-900/40 border border-purple-400/20">
            A
          </div>
          <span className="font-bold text-lg tracking-wide text-white">
            Aether AI
          </span>
        </div>

        {/* Styled Clerk Component */}
        <SignIn
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: "#a855f7",
              colorBackground: "#161922",
              colorInputBackground: "#0f1117",
              colorInputText: "#ffffff",
              colorText: "#ffffff",
              colorTextSecondary: "#94a3b8",
            },
            elements: {
              card: "shadow-2xl border border-slate-800 bg-[#161922]/90 backdrop-blur-xl",
              socialButtonsBlockButton: "bg-[#0f1117] border-slate-700 text-white hover:bg-slate-800",
              socialButtonsBlockButtonText: "text-white font-medium",
              formFieldLabel: "text-slate-300 font-medium",
              formFieldInput: "border-slate-700 bg-[#0f1117] text-white focus:border-purple-500",
              footerActionText: "text-slate-400",
              footerActionLink: "text-purple-400 hover:text-purple-300 font-semibold",
              headerTitle: "text-white text-xl font-bold",
              headerSubtitle: "text-slate-400",
              dividerLine: "bg-slate-800",
              dividerText: "text-slate-400",
            },
          }}
        />
      </div>
    </div>
  );
}