import { Card } from "@/components/ui/card"
import {
  Heart,
  AlertCircle,
  Activity,
  Users,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"
import * as React from "react"
import { useTranslation } from "react-i18next"

type Submodule = {
  titleKey: string
  descriptionKey: string
  contentKey: string
  sourceUrl: string
}

type ModuleType = {
  id: string
  titleKey: string
  descriptionKey: string
  icon: React.ElementType
  color: string
  submodules: Submodule[]
}

const modules: ModuleType[] = [
  {
    id: "A",
    titleKey: "education.modules.A.title",
    descriptionKey: "education.modules.A.description",
    icon: Heart,
    color: "bg-primary/10 text-primary",
    submodules: [
      {
        titleKey: "education.modules.A.submodules.introduction.title",
        descriptionKey: "education.modules.A.submodules.introduction.description",
        contentKey: "education.modules.A.submodules.introduction.content",
        sourceUrl: "https://www.heartfailurematters.org/understanding-heart-failure/",
      },
      {
        titleKey: "education.modules.A.submodules.whatIsHF.title",
        descriptionKey: "education.modules.A.submodules.whatIsHF.description",
        contentKey: "education.modules.A.submodules.whatIsHF.content",
        sourceUrl:
          "https://www.heartfailurematters.org/understanding-heart-failure/what-is-heart-failure/",
      },
      {
        titleKey: "education.modules.A.submodules.symptoms.title",
        descriptionKey: "education.modules.A.submodules.symptoms.description",
        contentKey: "education.modules.A.submodules.symptoms.content",
        sourceUrl:
          "https://www.heartfailurematters.org/understanding-heart-failure/what-are-the-symptoms-of-heart-failure/",
      },
      {
        titleKey: "education.modules.A.submodules.normalHeart.title",
        descriptionKey: "education.modules.A.submodules.normalHeart.description",
        contentKey: "education.modules.A.submodules.normalHeart.content",
        sourceUrl:
          "https://www.heartfailurematters.org/understanding-heart-failure/how-does-the-heart-work/",
      },
      {
        titleKey: "education.modules.A.submodules.types.title",
        descriptionKey: "education.modules.A.submodules.types.description",
        contentKey: "education.modules.A.submodules.types.content",
        sourceUrl:
          "https://www.heartfailurematters.org/understanding-heart-failure/what-do-the-different-terms-used-to-describe-heart-failure-mean/",
      },
    ],
  },
  {
    id: "B",
    titleKey: "education.modules.B.title",
    descriptionKey: "education.modules.B.description",
    icon: Activity,
    color: "bg-secondary/10 text-secondary",
    submodules: [
      {
        titleKey: "education.modules.B.submodules.introduction.title",
        descriptionKey: "education.modules.B.submodules.introduction.description",
        contentKey: "education.modules.B.submodules.introduction.content",
        sourceUrl:
          "https://www.heartfailurematters.org/heart-failure-causes-and-other-common-medical-conditions/",
      },
      {
        titleKey: "education.modules.B.submodules.commonHeartConditions.title",
        descriptionKey: "education.modules.B.submodules.commonHeartConditions.description",
        contentKey: "education.modules.B.submodules.commonHeartConditions.content",
        sourceUrl:
          "https://www.heartfailurematters.org/heart-failure-causes-and-other-common-medical-conditions/common-heart-conditions-that-may-cause-heart-failure/",
      },
      {
        titleKey: "education.modules.B.submodules.otherMedicalConditions.title",
        descriptionKey: "education.modules.B.submodules.otherMedicalConditions.description",
        contentKey: "education.modules.B.submodules.otherMedicalConditions.content",
        sourceUrl:
          "https://www.heartfailurematters.org/heart-failure-causes-and-other-common-medical-conditions/other-common-medical-conditions-and-heart-failure/",
      },
    ],
  },
  {
    id: "C",
    titleKey: "education.modules.C.title",
    descriptionKey: "education.modules.C.description",
    icon: BookOpen,
    color: "bg-chart-3/10 text-warning",
    submodules: [
      {
        titleKey: "education.modules.C.submodules.introduction.title",
        descriptionKey: "education.modules.C.submodules.introduction.description",
        contentKey: "education.modules.C.submodules.introduction.content",
        sourceUrl: "https://www.heartfailurematters.org/what-you-can-do/",
      },
      {
        titleKey: "education.modules.C.submodules.bloodPressurePulse.title",
        descriptionKey: "education.modules.C.submodules.bloodPressurePulse.description",
        contentKey: "education.modules.C.submodules.bloodPressurePulse.content",
        sourceUrl:
          "https://www.heartfailurematters.org/what-you-can-do/how-to-measure-your-blood-pressure-and-heart-rate/",
      },
      {
        titleKey: "education.modules.C.submodules.lifestyleChanges.title",
        descriptionKey: "education.modules.C.submodules.lifestyleChanges.description",
        contentKey: "education.modules.C.submodules.lifestyleChanges.content",
        sourceUrl:
          "https://www.heartfailurematters.org/what-you-can-do/lifestyle-changes/",
      },
      {
        titleKey: "education.modules.C.submodules.managingMedicines.title",
        descriptionKey: "education.modules.C.submodules.managingMedicines.description",
        contentKey: "education.modules.C.submodules.managingMedicines.content",
        sourceUrl:
          "https://www.heartfailurematters.org/what-you-can-do/taking-your-medication/",
      },
      {
        titleKey: "education.modules.C.submodules.supportGroups.title",
        descriptionKey: "education.modules.C.submodules.supportGroups.description",
        contentKey: "education.modules.C.submodules.supportGroups.content",
        sourceUrl:
          "https://www.heartfailurematters.org/what-you-can-do/finding-support-groups-and-other-useful-organisations/",
      },
    ],
  },
  {
    id: "D",
    titleKey: "education.modules.D.title",
    descriptionKey: "education.modules.D.description",
    icon: Activity,
    color: "bg-chart-2/10 text-secondary",
    submodules: [
      {
        titleKey: "education.modules.D.submodules.introduction.title",
        descriptionKey: "education.modules.D.submodules.introduction.description",
        contentKey: "education.modules.D.submodules.introduction.content",
        sourceUrl: "https://www.heartfailurematters.org/living-with-heart-failure/",
      },
      {
        titleKey: "education.modules.D.submodules.travel.title",
        descriptionKey: "education.modules.D.submodules.travel.description",
        contentKey: "education.modules.D.submodules.travel.content",
        sourceUrl:
          "https://www.heartfailurematters.org/living-with-heart-failure/travelling/",
      },
      {
        titleKey: "education.modules.D.submodules.vaccines.title",
        descriptionKey: "education.modules.D.submodules.vaccines.description",
        contentKey: "education.modules.D.submodules.vaccines.content",
        sourceUrl:
          "https://www.heartfailurematters.org/living-with-heart-failure/vaccinations/",
      },
      {
        titleKey: "education.modules.D.submodules.workAdjustments.title",
        descriptionKey: "education.modules.D.submodules.workAdjustments.description",
        contentKey: "education.modules.D.submodules.workAdjustments.content",
        sourceUrl:
          "https://www.heartfailurematters.org/living-with-heart-failure/working/",
      },
      {
        titleKey: "education.modules.D.submodules.emotions.title",
        descriptionKey: "education.modules.D.submodules.emotions.description",
        contentKey: "education.modules.D.submodules.emotions.content",
        sourceUrl:
          "https://www.heartfailurematters.org/living-with-heart-failure/your-emotions/",
      },
    ],
  },
  {
    id: "E",
    titleKey: "education.modules.E.title",
    descriptionKey: "education.modules.E.description",
    icon: Users,
    color: "bg-chart-5/10 text-chart-5",
    submodules: [
      {
        titleKey: "education.modules.E.submodules.introduction.title",
        descriptionKey: "education.modules.E.submodules.introduction.description",
        contentKey: "education.modules.E.submodules.introduction.content",
        sourceUrl: "https://www.heartfailurematters.org/for-caregivers/",
      },
      {
        titleKey: "education.modules.E.submodules.howToHelp.title",
        descriptionKey: "education.modules.E.submodules.howToHelp.description",
        contentKey: "education.modules.E.submodules.howToHelp.content",
        sourceUrl:
          "https://www.heartfailurematters.org/for-caregivers/checklist/",
      },
      {
        titleKey: "education.modules.E.submodules.caringStress.title",
        descriptionKey: "education.modules.E.submodules.caringStress.description",
        contentKey: "education.modules.E.submodules.caringStress.content",
        sourceUrl:
          "https://www.heartfailurematters.org/for-caregivers/caring-can-be-hard/",
      },
      {
        titleKey: "education.modules.E.submodules.financialConcerns.title",
        descriptionKey: "education.modules.E.submodules.financialConcerns.description",
        contentKey: "education.modules.E.submodules.financialConcerns.content",
        sourceUrl:
          "https://www.heartfailurematters.org/for-caregivers/financial-concerns/",
      },
      {
        titleKey: "education.modules.E.submodules.supportServices.title",
        descriptionKey: "education.modules.E.submodules.supportServices.description",
        contentKey: "education.modules.E.submodules.supportServices.content",
        sourceUrl:
          "https://www.heartfailurematters.org/for-caregivers/finding-support/",
      },
    ],
  },
  {
    id: "F",
    titleKey: "education.modules.H.title",
    descriptionKey: "education.modules.H.description",
    icon: AlertCircle,
    color: "bg-accent/10 text-accent",
    submodules: [
      {
        titleKey: "education.modules.H.submodules.introduction.title",
        descriptionKey: "education.modules.H.submodules.introduction.description",
        contentKey: "education.modules.H.submodules.introduction.content",
        sourceUrl: "https://www.heartfailurematters.org/warning-signs/",
      },
      {
        titleKey: "education.modules.H.submodules.shortnessOfBreath.title",
        descriptionKey: "education.modules.H.submodules.shortnessOfBreath.description",
        contentKey: "education.modules.H.submodules.shortnessOfBreath.content",
        sourceUrl:
          "https://www.heartfailurematters.org/warning-signs/shortness-of-breath/",
      },
      {
        titleKey: "education.modules.H.submodules.chestPain.title",
        descriptionKey: "education.modules.H.submodules.chestPain.description",
        contentKey: "education.modules.H.submodules.chestPain.content",
        sourceUrl:
          "https://www.heartfailurematters.org/warning-signs/chest-pain/",
      },
      {
        titleKey: "education.modules.H.submodules.rapidWeightGain.title",
        descriptionKey: "education.modules.H.submodules.rapidWeightGain.description",
        contentKey: "education.modules.H.submodules.rapidWeightGain.content",
        sourceUrl:
          "https://www.heartfailurematters.org/warning-signs/rapid-weight-gain/",
      },
      {
        titleKey: "education.modules.H.submodules.swellingLegs.title",
        descriptionKey: "education.modules.H.submodules.swellingLegs.description",
        contentKey: "education.modules.H.submodules.swellingLegs.content",
        sourceUrl:
          "https://www.heartfailurematters.org/warning-signs/swelling-in-legs-or-ankles/",
      },
    ],
  },
]

type SelectedContent = {
  moduleId: string
  moduleTitle: string
  title: string
  description: string
  content: string
  sourceUrl: string
}

export default function Education() {
  const { t } = useTranslation()
  const [query, setQuery] = React.useState("")
  const [openModule, setOpenModule] = React.useState<string | null>(null)
  const [selectedContent, setSelectedContent] = React.useState<SelectedContent | null>(null)

  const filtered = modules.filter((m) => {
    const q = query.trim().toLowerCase()
    if (!q) return true

    const moduleTitle = t(m.titleKey).toLowerCase()
    const moduleDescription = t(m.descriptionKey).toLowerCase()

    const matchesModule =
      m.id.toLowerCase().includes(q) ||
      moduleTitle.includes(q) ||
      moduleDescription.includes(q)

    const matchesSubmodule = m.submodules.some((s) => {
      const subTitle = t(s.titleKey).toLowerCase()
      const subDescription = t(s.descriptionKey).toLowerCase()
      const subContent = t(s.contentKey).toLowerCase()

      return (
        subTitle.includes(q) ||
        subDescription.includes(q) ||
        subContent.includes(q)
      )
    })

    return matchesModule || matchesSubmodule
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("education.pageTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("education.pageDescription")}
          </p>
        </div>

        <div className="mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("education.searchPlaceholder")}
            aria-label={t("education.searchAria")}
            className="w-full md:w-96 px-4 py-2 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {selectedContent && (
          <Card className="mb-8 p-6 border-primary/20">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                  {t("education.moduleLabel")} {selectedContent.moduleId} · {selectedContent.moduleTitle}
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {selectedContent.title}
                </h2>
                <p className="text-muted-foreground">
                  {selectedContent.description}
                </p>
              </div>

              <button
                onClick={() => setSelectedContent(null)}
                className="p-2 rounded-md border border-border hover:bg-muted"
                aria-label={t("education.closeContent")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground mb-3">
                {t("education.learningContent")}
              </h3>
              <p className="text-sm text-muted-foreground leading-7 whitespace-pre-line">
                {selectedContent.content}
              </p>
            </div>

            <div className="mt-4">
              <a
                href={selectedContent.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
              >
                {t("education.viewSource")}
              </a>
            </div>
          </Card>
        )}

        <div className="space-y-6">
          {filtered.map((module) => {
            const Icon = module.icon
            const isOpen = openModule === module.id
            const moduleTitle = t(module.titleKey)
            const moduleDescription = t(module.descriptionKey)

            return (
              <Card key={module.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${module.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                        {t("education.moduleLabel")} {module.id}
                      </div>
                      <h3 className="font-bold text-xl text-foreground mb-2">
                        {moduleTitle}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {moduleDescription}
                      </p>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setOpenModule(isOpen ? null : module.id)}
                          className="px-4 py-2 rounded-md border border-border text-sm font-medium flex items-center gap-2"
                        >
                          {isOpen ? (
                            <>
                              {t("education.hideSubmodules")} <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              {t("education.showSubmodules")} <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {module.submodules.map((sub, index) => {
                      const subTitle = t(sub.titleKey)
                      const subDescription = t(sub.descriptionKey)
                      const subContent = t(sub.contentKey)

                      return (
                        <Card key={index} className="p-4 border border-border">
                          <h4 className="font-semibold text-foreground mb-2">
                            {subTitle}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            {subDescription}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                setSelectedContent({
                                  moduleId: module.id,
                                  moduleTitle,
                                  title: subTitle,
                                  description: subDescription,
                                  content: subContent,
                                  sourceUrl: sub.sourceUrl,
                                })
                              }
                              className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm"
                            >
                              {t("education.readContent")}
                            </button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        <Card className="mt-8 p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground mb-2">
                {t("education.featuresTitle")}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  {t("education.features.guides")}
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  {t("education.features.structured")}
                </li>
                <li className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  {t("education.features.warning")}
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-4">
                {t("education.featuresFooter")}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}