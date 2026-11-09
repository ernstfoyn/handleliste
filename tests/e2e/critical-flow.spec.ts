import { expect, test, type Page } from '@playwright/test';

const configured = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);

async function signInAsGuest(page: Page, name: string): Promise<void> {
  const guestButton = page.getByRole('button', { name: 'Fortsett som gjest' });
  await expect(guestButton).toBeVisible({ timeout: 15_000 });
  await page.getByLabel(/Navn/).fill(name);
  await guestButton.click();
}

test.describe('kritisk flyt', () => {
  test('opprett liste, legg til vare, avhuk, del og synk offline', async ({ browser }) => {
    test.skip(
      !configured,
      'Krever VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY i .env.local (Supabase lokalt).',
    );
    test.setTimeout(90_000);
    const stamp = Date.now();
    const listName = `E2E-handleliste ${stamp}`;

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto('/');
    await signInAsGuest(pageA, `E2E A ${stamp}`);
    await expect(pageA.getByRole('heading', { name: /^Hei/ })).toBeVisible({ timeout: 15_000 });

    await pageA.getByRole('button', { name: 'Ny liste' }).first().click();
    await pageA.getByLabel('Navn på listen').fill(listName);
    await pageA.getByRole('button', { name: 'Opprett liste' }).click();
    await expect(pageA.getByRole('heading', { name: listName })).toBeVisible({ timeout: 15_000 });

    const quickAddA = pageA.getByLabel('Legg til vare');
    await quickAddA.fill('Brød');
    await quickAddA.press('Enter');
    await expect(pageA.getByTestId('item-row').filter({ hasText: 'Brød' })).toBeVisible({
      timeout: 5_000,
    });

    await pageA.getByRole('button', { name: 'Del', exact: true }).click();
    await pageA.getByRole('button', { name: 'Lag invitasjonslenke' }).click();
    const inviteLink = await pageA.getByLabel('Invitasjonslenke').inputValue();
    expect(inviteLink).toContain('/join/');

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto(inviteLink);
    await signInAsGuest(pageB, `E2E B ${stamp}`);
    await expect(pageB.getByRole('heading', { name: listName })).toBeVisible({
      timeout: 20_000,
    });
    await expect(pageB.getByTestId('item-row').filter({ hasText: 'Brød' })).toBeVisible({
      timeout: 10_000,
    });

    await pageA.getByRole('button', { name: 'Lukk' }).click();
    await pageA.getByRole('button', { name: 'Merk Brød som kjøpt' }).click();
    await expect(pageB.getByRole('button', { name: 'Merk Brød som ikke kjøpt' })).toBeVisible({
      timeout: 2_000,
    });

    await contextA.setOffline(true);
    await expect(pageA.getByText(/Du er offline/)).toBeVisible({ timeout: 5_000 });
    const quickAddOffline = pageA.getByLabel('Legg til vare');
    await quickAddOffline.fill('Melk');
    await quickAddOffline.press('Enter');
    await expect(pageA.getByTestId('item-row').filter({ hasText: 'Melk' })).toBeVisible({
      timeout: 5_000,
    });

    await contextA.setOffline(false);
    await expect(pageB.getByTestId('item-row').filter({ hasText: 'Melk' })).toBeVisible({
      timeout: 20_000,
    });

    await pageA.reload();
    await expect(pageA.getByTestId('item-row').filter({ hasText: 'Melk' })).toHaveCount(1, {
      timeout: 20_000,
    });

    await contextA.close();
    await contextB.close();
  });
});
