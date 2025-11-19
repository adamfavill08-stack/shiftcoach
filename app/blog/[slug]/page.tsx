'use client'

import { use } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

const blogPosts = [
  {
    slug: "manage-fatigue",
    title: "How to Manage Fatigue as a Shift Worker",
    description: "Practical strategies to help reduce tiredness at work",
    content: `Shift work can be physically and mentally demanding, leading to significant fatigue that impacts both your work performance and personal life. Understanding how to manage this fatigue is crucial for maintaining your health and well-being.

One of the most effective strategies is to prioritize sleep quality over quantity. Even if you can't get a full 8 hours, ensuring your sleep environment is dark, quiet, and cool can dramatically improve the restorative value of your rest. Consider using blackout curtains, earplugs, or a white noise machine to create an optimal sleep environment.

Another key approach is strategic napping. Short power naps of 20-30 minutes can help recharge your energy without leaving you groggy. For night shift workers, a nap before your shift can be particularly beneficial in preparing your body for the night ahead.

Nutrition also plays a critical role in managing fatigue. Avoid heavy, greasy meals before or during your shift, as they can make you feel sluggish. Instead, opt for light, protein-rich snacks and meals that provide sustained energy. Stay hydrated throughout your shift, as dehydration can significantly contribute to feelings of tiredness.

Finally, consider your caffeine intake carefully. While caffeine can provide a temporary energy boost, consuming it too late in your shift can interfere with your ability to sleep when you get home. Establish a caffeine cutoff time that allows your body to wind down naturally.`
  },
  {
    slug: "impact-of-shift-work",
    title: "The Impact of Shift Work on Your Health",
    description: "Understanding the long-term effects and how to mitigate them",
    content: `Shift work, particularly night shifts and rotating schedules, can have profound effects on your physical and mental health. Understanding these impacts is the first step toward mitigating them and protecting your long-term well-being.

One of the most significant concerns is the disruption of your circadian rhythm—your body's natural 24-hour cycle. When you work against this natural rhythm, it can lead to sleep disorders, digestive issues, and increased risk of chronic conditions like cardiovascular disease and diabetes.

Sleep disruption is perhaps the most immediate and noticeable effect. Shift workers often experience insomnia, excessive daytime sleepiness, and reduced sleep quality. This can create a cycle where poor sleep leads to increased stress, which further disrupts sleep patterns.

Digestive health is another area significantly affected by shift work. Irregular meal times and eating during what your body considers "nighttime" can disrupt your digestive system, leading to issues like indigestion, acid reflux, and changes in appetite.

Mental health can also be impacted. The social isolation that often comes with working nights or irregular hours, combined with sleep deprivation, can increase the risk of depression and anxiety. The disruption to family and social life can add additional stress.

However, understanding these risks allows you to take proactive steps. Maintaining consistent sleep schedules when possible, prioritizing sleep hygiene, eating meals at regular times relative to your shift, and staying connected with loved ones can all help mitigate these effects.`
  },
  {
    slug: "meal-timing-tips",
    title: "Meal Timing Tips for Different Shifts",
    description: "Optimal eating patterns tailored to various shift schedules",
    content: `When you work shifts, your meal timing becomes just as important as what you eat. Aligning your eating patterns with your work schedule can help maintain your energy levels, support better sleep, and reduce digestive issues.

For day shift workers (6 AM - 2 PM or 7 AM - 3 PM), try to eat your largest meal in the morning or early afternoon when your body is naturally most alert. A substantial breakfast can provide sustained energy throughout your shift. Keep lunch moderate, and have a lighter dinner in the early evening to allow your body time to digest before sleep.

Night shift workers (10 PM - 6 AM or 11 PM - 7 AM) face the unique challenge of eating during their body's "biological night." Have a substantial meal before your shift begins, around 6-7 PM. During your shift, eat light, protein-rich snacks to maintain energy without overwhelming your digestive system. When you get home in the morning, have a light meal or snack before sleep—think of it as your "dinner"—but keep it small to avoid disrupting your sleep.

For rotating shift workers, the key is flexibility and consistency within each shift type. When you're on days, follow day shift patterns. When you're on nights, follow night shift patterns. Try to transition your meal times gradually when switching between shifts, shifting your eating schedule by 1-2 hours each day rather than making an abrupt change.

Regardless of your shift type, avoid large meals within 2-3 hours of your main sleep period. This gives your digestive system time to process food before you rest, improving both sleep quality and digestive comfort.`
  },
  {
    slug: "sleep-quality-rotating-shifts",
    title: "Improving Sleep Quality on Rotating Shifts",
    description: "Effective methods to enhance sleep during changing shifts",
    content: `Rotating shifts present one of the greatest challenges to maintaining healthy sleep patterns. Your body never fully adapts to one schedule before it's time to switch again. However, with the right strategies, you can significantly improve your sleep quality even with a rotating schedule.

The foundation of good sleep on rotating shifts is creating a consistent sleep environment. Your bedroom should be completely dark—consider blackout curtains or a sleep mask. Keep the room cool (around 65-68°F or 18-20°C) and quiet. If noise is unavoidable, use earplugs or a white noise machine to mask disruptive sounds.

Timing your sleep strategically is crucial. After a night shift, try to sleep as soon as possible after getting home, ideally within an hour. This helps your body maintain some circadian rhythm. After a day shift, maintain a more traditional evening sleep schedule. The key is consistency within each shift type.

Light exposure management is another powerful tool. After night shifts, wear sunglasses on your way home to signal to your body that it's time to sleep. When you wake up, expose yourself to bright light to help reset your internal clock. Consider using a light therapy lamp, especially during the darker months.

Establish a pre-sleep routine that signals to your body that it's time to rest, regardless of what time of day you're sleeping. This might include reading, gentle stretching, or meditation. Avoid screens for at least 30 minutes before sleep, as the blue light can interfere with melatonin production.

Finally, be patient with yourself. It takes time for your body to adjust to shift changes. Give yourself grace during transition periods, and focus on what you can control: your sleep environment, your routine, and your commitment to prioritizing rest.`
  }
]

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = use(params)
  const post = blogPosts.find(p => p.slug === slug)

  if (!post) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="max-w-[440px] mx-auto min-h-screen px-5 pb-12 pt-6">
          <div className="text-center py-12">
            <h1 className="text-xl font-bold text-slate-900 mb-2">Article not found</h1>
            <p className="text-slate-500 mb-6">The article you're looking for doesn't exist.</p>
            <Link
              href="/shift-rhythm"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Blog
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-[440px] mx-auto min-h-screen px-5 pb-12 pt-6">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <Link
            href="/shift-rhythm"
            className="p-2 rounded-xl bg-white/90 backdrop-blur-xl border border-white/80 text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-all hover:bg-white hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] active:scale-95"
            aria-label="Back to blog"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Blog</h1>
        </header>

        {/* Article */}
        <article className="relative overflow-hidden rounded-xl bg-white/90 backdrop-blur-2xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.5)]">
          {/* Premium gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/85" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20" />
          
          {/* Enhanced inner glow */}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/60" />
          
          <div className="relative z-10 px-6 py-6">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-900 mb-2">
              {post.title}
            </h2>
            <p className="text-[14px] text-slate-500 mb-6 leading-relaxed">
              {post.description}
            </p>
            <div className="prose prose-sm max-w-none">
              <p className="text-[14px] leading-relaxed text-slate-700 whitespace-pre-line">
                {post.content}
              </p>
            </div>
          </div>
        </article>
      </div>
    </main>
  )
}

