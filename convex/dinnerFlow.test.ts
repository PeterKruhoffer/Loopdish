import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vite-plus/test'
import { api } from './_generated/api'
import schema from './schema'
import { modules } from './test.setup'

const week = {
  startDate: '2026-08-24',
  endDate: '2026-08-30',
}

describe('LoopDish dinner flow', () => {
  it('requires authentication', async () => {
    const t = convexTest(schema, modules)

    await expect(t.query(api.dashboard.get, week)).rejects.toThrow('Sign in to use LoopDish')
    await expect(t.mutation(api.dishes.add, { name: 'Tacos' })).rejects.toThrow(
      'Sign in to use LoopDish',
    )
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
