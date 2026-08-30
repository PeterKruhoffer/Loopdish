import type { FunctionReturnType } from 'convex/server'
import { api } from '../../../convex/_generated/api'

export type DashboardData = FunctionReturnType<typeof api.dashboard.get>
export type Dish = DashboardData['dishes'][number]
export type PlannedMeal = DashboardData['plannedMeals'][number]
export type RecentMeal = DashboardData['recentMeals'][number]
