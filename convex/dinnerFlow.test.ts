import { convexTest } from 'convex-test'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { api, internal } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

const week = {
  startDate: '2026-08-24',
  endDate: '2026-08-30',
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('LoopDish dinner flow', () => {
  it('requires authentication', async () => {
    const t = convexTest(schema, modules)

    await expect(t.query(api.dashboard.get, week)).rejects.toThrow('Sign in to use LoopDish')
    await expect(t.mutation(api.dishes.add, { name: 'Tacos' })).rejects.toThrow(
      'Sign in to use LoopDish',
    )
    await expect(
      t.action(api.suggestions.generate, {
        kind: 'new_dishes',
        startDate: week.startDate,
        endDate: week.endDate,
        language: 'en',
      }),
    ).rejects.toThrow('Sign in to use LoopDish')
  })

  it('adds, plans, and records a dinner', async () => {
    const t = convexTest(schema, modules).withIdentity({ subject: 'user-one' })

    expect(await t.query(api.dashboard.get, week)).toMatchObject({
      household: null,
      dishes: [],
      plannedMeals: [],
      recentMeals: [],
    })

    const dishId = await t.mutation(api.dishes.add, {
      name: '  Rotisserie chicken  ',
      notes: 'With salad',
    })
    const planId = await t.mutation(api.mealPlans.plan, {
      dishId,
      date: '2026-08-29',
    })

    let dashboard = await t.query(api.dashboard.get, week)
    expect(dashboard.dishes).toHaveLength(1)
    expect(dashboard.dishes[0]).toMatchObject({
      name: 'Rotisserie chicken',
      notes: 'With salad',
      timesEaten: 0,
    })
    expect(dashboard.plannedMeals[0]).toMatchObject({
      _id: planId,
      date: '2026-08-29',
      dishName: 'Rotisserie chicken',
    })

    await t.mutation(api.mealPlans.markEaten, { planId })
    await t.mutation(api.mealPlans.markEaten, { planId })

    dashboard = await t.query(api.dashboard.get, week)
    expect(dashboard.dishes[0]).toMatchObject({
      lastEatenOn: '2026-08-29',
      timesEaten: 1,
    })
    expect(dashboard.plannedMeals[0].completedAt).toBeTypeOf('number')
    expect(dashboard.recentMeals).toHaveLength(1)
    expect(dashboard.recentMeals[0]).toMatchObject({
      eatenOn: '2026-08-29',
      dishName: 'Rotisserie chicken',
    })
  })

  it('keeps two to five distinct new dishes from a model response', async () => {
    const t = convexTest(schema, modules).withIdentity({ subject: 'user-one' })
    await t.mutation(api.dishes.add, { name: 'Tacos' })
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'test-account')
    vi.stubEnv('CLOUDFLARE_AUTH_TOKEN', 'test-token')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          success: true,
          result: {
            response: {
              dishes: [
                { name: 'Tacos', notes: 'Saved already', reason: 'Familiar' },
                { name: 'Tomato soup', notes: 'Serve with bread', reason: 'A simple new option' },
                { name: 'Chickpea curry', notes: 'Serve with rice', reason: 'Adds some variety' },
                { name: 'Tomato soup', notes: 'Duplicate', reason: 'Duplicate' },
                { name: 'tacos', notes: 'Saved already', reason: 'Duplicate' },
              ],
            },
          },
        }),
      ),
    )

    const result = await t.action(api.suggestions.generate, {
      kind: 'new_dishes',
      startDate: week.startDate,
      endDate: week.endDate,
      language: 'en',
    })

    expect(result).toMatchObject({
      kind: 'new_dishes',
      dishes: [{ name: 'Tomato soup' }, { name: 'Chickpea curry' }],
    })
  })

  it('replaces an existing plan and rejects duplicate dishes', async () => {
    const t = convexTest(schema, modules).withIdentity({ subject: 'user-one' })
    const firstDishId = await t.mutation(api.dishes.add, {
      name: 'Tacos',
    })
    const secondDishId = await t.mutation(api.dishes.add, {
      name: 'Spaghetti',
    })

    const originalPlanId = await t.mutation(api.mealPlans.plan, {
      dishId: firstDishId,
      date: '2026-08-27',
    })
    const replacedPlanId = await t.mutation(api.mealPlans.plan, {
      dishId: secondDishId,
      date: '2026-08-27',
    })

    expect(replacedPlanId).toBe(originalPlanId)
    const dashboard = await t.query(api.dashboard.get, week)
    expect(dashboard.plannedMeals).toHaveLength(1)
    expect(dashboard.plannedMeals[0].dishName).toBe('Spaghetti')

    await expect(
      t.mutation(api.dishes.add, {
        name: 'tacos',
      }),
    ).rejects.toThrow('Tacos is already in your dishes')
  })

  it('applies a suggested week, reuses dishes, and preserves completed meals', async () => {
    const t = convexTest(schema, modules).withIdentity({ subject: 'user-one' })
    const tacosId = await t.mutation(api.dishes.add, { name: 'Tacos' })
    const completedPlanId = await t.mutation(api.mealPlans.plan, {
      dishId: tacosId,
      date: '2026-08-24',
    })
    await t.mutation(api.mealPlans.markEaten, { planId: completedPlanId })
    const oldPlanId = await t.mutation(api.mealPlans.plan, {
      dishId: tacosId,
      date: '2026-08-25',
    })

    const result = await t.mutation(api.mealPlans.applySuggestion, {
      meals: [
        { date: '2026-08-24', name: 'Tomato soup', notes: 'With bread' },
        { date: '2026-08-25', name: 'Tomato soup' },
        { date: '2026-08-26', name: 'Tomato soup' },
        { date: '2026-08-27', name: 'Tacos' },
        { date: '2026-08-28', name: 'Tomato soup' },
        { date: '2026-08-29', name: 'Tacos' },
        { date: '2026-08-30', name: 'Tomato soup' },
      ],
    })

    expect(result).toEqual({ preservedDates: ['2026-08-24'] })
    const dashboard = await t.query(api.dashboard.get, week)
    expect(dashboard.dishes.map((dish) => dish.name)).toEqual(['Tacos', 'Tomato soup'])
    expect(dashboard.plannedMeals).toHaveLength(7)
    expect(dashboard.plannedMeals.find((meal) => meal.date === '2026-08-24')).toMatchObject({
      _id: completedPlanId,
      dishName: 'Tacos',
      completedAt: expect.any(Number),
    })
    expect(dashboard.plannedMeals.find((meal) => meal.date === '2026-08-25')).toMatchObject({
      _id: oldPlanId,
      dishName: 'Tomato soup',
    })
  })

  it('rejects invalid suggested weeks before changing the plan', async () => {
    const t = convexTest(schema, modules).withIdentity({ subject: 'user-one' })
    await t.mutation(api.dishes.add, { name: 'Tacos' })

    await expect(
      t.mutation(api.mealPlans.applySuggestion, {
        meals: [
          { date: '2026-08-24', name: 'Tacos' },
          { date: '2026-08-25', name: 'Soup' },
          { date: '2026-08-26', name: 'Curry' },
          { date: '2026-08-27', name: 'Pizza' },
          { date: '2026-08-28', name: 'Tacos' },
          { date: '2026-08-29', name: 'Tacos' },
          { date: '2026-08-30', name: 'Tacos' },
        ],
      }),
    ).rejects.toThrow('at most two new dishes')

    await expect(
      t.mutation(api.mealPlans.applySuggestion, {
        meals: [
          { date: '2026-08-24', name: 'Tacos' },
          { date: '2026-08-25', name: 'Soup' },
          { date: '2026-08-26', name: 'Tacos' },
          { date: '2026-08-27', name: 'Soup' },
          { date: '2026-08-28', name: 'Tacos' },
          { date: '2026-08-29', name: 'Soup' },
          { date: '2026-08-31', name: 'Tacos' },
        ],
      }),
    ).rejects.toThrow('seven consecutive days')

    expect((await t.query(api.dashboard.get, week)).plannedMeals).toHaveLength(0)
  })

  it('limits each household to five AI generations per 24 hours', async () => {
    const t = convexTest(schema, modules).withIdentity({ subject: 'user-one' })
    await t.mutation(api.dishes.add, { name: 'Tacos' })

    for (let count = 0; count < 5; count += 1) {
      await t.mutation(internal.suggestionLimits.reserve, {})
    }
    await expect(t.mutation(internal.suggestionLimits.reserve, {})).rejects.toThrow(
      'five AI suggestions',
    )
  })

  it("does not expose or modify another user's meals", async () => {
    const test = convexTest(schema, modules)
    const firstUser = test.withIdentity({ subject: 'user-one' })
    const secondUser = test.withIdentity({ subject: 'user-two' })
    const dishId = await firstUser.mutation(api.dishes.add, { name: 'Spaghetti' })
    const planId = await firstUser.mutation(api.mealPlans.plan, {
      dishId,
      date: '2026-08-29',
    })

    expect(await secondUser.query(api.dashboard.get, week)).toMatchObject({
      household: null,
      dishes: [],
      plannedMeals: [],
      recentMeals: [],
    })
    await expect(secondUser.mutation(api.mealPlans.markEaten, { planId })).rejects.toThrow(
      'That planned meal is not in your household',
    )
    await expect(secondUser.mutation(api.mealPlans.remove, { planId })).rejects.toThrow(
      'That planned meal is not in your household',
    )

    expect((await firstUser.query(api.dashboard.get, week)).plannedMeals).toHaveLength(1)
  })

  it('shares dishes and plans with an invited household member', async () => {
    const test = convexTest(schema, modules)
    const owner = test.withIdentity({
      subject: 'owner',
      name: 'Alex Jensen',
      email: 'alex@example.com',
    })
    const member = test.withIdentity({
      subject: 'member',
      name: 'Sam Jensen',
      email: 'sam@example.com',
    })

    const dishId = await owner.mutation(api.dishes.add, { name: 'Tacos' })
    await owner.mutation(api.mealPlans.plan, { dishId, date: '2026-08-29' })
    await owner.mutation(api.households.rename, { name: 'The Jensen home' })
    const inviteId = await owner.mutation(api.households.createInvite, {})

    expect(await test.query(api.households.getInvite, { inviteId })).toEqual({
      householdName: 'The Jensen home',
      available: true,
    })

    await member.mutation(api.households.acceptInvite, { inviteId })

    expect(await test.query(api.households.getInvite, { inviteId })).toEqual({
      householdName: 'The Jensen home',
      available: false,
    })
    expect((await member.query(api.dashboard.get, week)).plannedMeals[0]).toMatchObject({
      date: '2026-08-29',
      dishName: 'Tacos',
    })

    await member.mutation(api.dishes.add, { name: 'Soup' })
    expect((await owner.query(api.dashboard.get, week)).dishes.map((dish) => dish.name)).toEqual([
      'Soup',
      'Tacos',
    ])

    const household = await owner.query(api.households.get, {})
    expect(household.household?.name).toBe('The Jensen home')
    expect(household.members).toMatchObject([
      { name: 'Alex Jensen', role: 'owner', isCurrentUser: true },
      { name: 'Sam Jensen', role: 'member', isCurrentUser: false },
    ])

    expect(household.canManageHousehold).toBe(true)
    await expect(member.mutation(api.households.rename, { name: "Sam's home" })).rejects.toThrow(
      'Only the household owner can do that',
    )
    await expect(member.mutation(api.households.createInvite, {})).rejects.toThrow(
      'Only the household owner can do that',
    )
    expect((await member.query(api.households.get, {})).canManageHousehold).toBe(false)
  })

  it('consumes an invite opened by an existing household member', async () => {
    const test = convexTest(schema, modules)
    const owner = test.withIdentity({ subject: 'owner' })
    const outsider = test.withIdentity({ subject: 'outsider' })
    await owner.mutation(api.dishes.add, { name: 'Tacos' })
    const inviteId = await owner.mutation(api.households.createInvite, {})

    await owner.mutation(api.households.acceptInvite, { inviteId })

    expect((await test.query(api.households.getInvite, { inviteId }))?.available).toBe(false)
    await expect(outsider.mutation(api.households.acceptInvite, { inviteId })).rejects.toThrow(
      'That invite is no longer available',
    )
  })

  it('does not let an existing household join a second household', async () => {
    const test = convexTest(schema, modules)
    const firstOwner = test.withIdentity({ subject: 'first-owner' })
    const secondOwner = test.withIdentity({ subject: 'second-owner' })
    await firstOwner.mutation(api.dishes.add, { name: 'Tacos' })
    await secondOwner.mutation(api.dishes.add, { name: 'Soup' })
    const inviteId = await firstOwner.mutation(api.households.createInvite, {})

    await expect(secondOwner.mutation(api.households.acceptInvite, { inviteId })).rejects.toThrow(
      'You already belong to another household',
    )
  })
})
