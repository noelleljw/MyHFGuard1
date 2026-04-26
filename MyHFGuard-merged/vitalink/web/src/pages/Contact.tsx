import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Info, Mail, MessageCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

export default function Contact() {
  const { t } = useTranslation()

  const handleEmergencyCall = () => {
    alert("Redirecting to emergency call...")
    window.location.href = "tel:999"
  }

  const handleEmailSupport = () => {
    window.location.href =
      "mailto:myhfguard.host@gmail.com?subject=MyHFGuard Support Request&body=Hello,%0D%0A%0D%0AUser Issue:%0D%0A%0D%0ADevice:%0D%0AApp Version:%0D%0AProblem:%0D%0A"
  }

  const handleWhatsAppSupport = () => {
    window.open(
      "https://wa.me/601XXXXXXXXX?text=Hello%20MyHFGuard%20team,%20I%20need%20help%20with%20the%20app.",
      "_blank"
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8">

        <h1 className="mb-2 text-3xl font-bold text-foreground">
          {t("helpSupport.title")}
        </h1>

        <p className="mb-6 text-muted-foreground">
          {t("helpSupport.subtitle")}
        </p>

        <div className="grid gap-6">

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                {t("helpSupport.aboutTitle")}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-muted-foreground">
                {t("helpSupport.aboutBody")}
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                {t("helpSupport.contactUs")}
              </CardTitle>

              <CardDescription>
                {t("helpSupport.needHelp")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">

              {/* 🚨 Emergency */}
              <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <Phone className="mt-1 h-5 w-5 text-red-600" />

                  <div className="flex-1">
                    <h3 className="font-semibold text-red-700">
                      {t("helpSupport.emergencyContact")}
                    </h3>

                    <p className="mt-1 text-sm text-red-700/90">
                      {t("helpSupport.emergencyBody")}
                    </p>

                    <div className="mt-4">
                      <Button
                        onClick={handleEmergencyCall}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        {t("helpSupport.callButton")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 📧 Email */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-1 h-5 w-5 text-primary" />

                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {t("helpSupport.supportTitle")}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("helpSupport.supportBody")}
                    </p>

                    <div className="mt-4">
                      <Button variant="outline" onClick={handleEmailSupport}>
                        {t("helpSupport.emailButton")}
                      </Button>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      myhfguard.host@gmail.com
                    </p>
                  </div>
                </div>
              </div>

              {/* 💬 WhatsApp */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <MessageCircle className="mt-1 h-5 w-5 text-primary" />

                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {t("helpSupport.whatsappTitle")}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("helpSupport.whatsappBody")}
                    </p>

                    <div className="mt-4">
                      <Button variant="outline" onClick={handleWhatsAppSupport}>
                        {t("helpSupport.whatsappButton")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground mt-2">
                {t("helpSupport.disclaimer")}
              </p>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}