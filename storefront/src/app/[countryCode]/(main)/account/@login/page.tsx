import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Inicie sessão na sua conta Higitotal.",
}

export default function Login() {
  return <LoginTemplate />
}
