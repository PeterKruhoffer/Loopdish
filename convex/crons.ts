import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.hourly('complete past dinners', { minuteUTC: 5 }, internal.mealPlans.completePastMeals, {})

export default crons
