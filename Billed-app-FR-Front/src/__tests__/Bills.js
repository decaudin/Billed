/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import Bills from "../containers/Bills.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

// Mock du module store pour utiliser le mockStore

jest.mock("../app/store", () => mockStore);

// Fonction pour afficher la page souhaitée en fonction du paramètre (pathname)

const setupPage = (pathname) => {
  document.body.innerHTML = "";
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.append(root);
  router();
  window.onNavigate(pathname);
};

// Fonction pour créer une nouvelle instance de la classe Bills

const setupBills = () => {
  return new Bills({
    document,
    onNavigate: (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    },
    store: mockStore,
    localStorage: window.localStorage,
  });
};

describe("Given I am connected as an employee", () => {

  // Avant chaque test, configure le localStorage pour simuler un employé connecté

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee',
      email: 'employee@test.tld'
    }));
  });

  describe("When I am on Bills Page", () => {

    test("Then bill icon in vertical layout should be highlighted", async () => {
      setupPage(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId('icon-window'));
      const windowIcon = screen.getByTestId('icon-window');
      expect(windowIcon.className).toBe("active-icon");
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML);
      const antiChrono = (a, b) => ((a < b) ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });

    test("Then a modal should open when clicking on an eye icon", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const eyesIcons = screen.getAllByTestId("icon-eye");
      eyesIcons.forEach((eyeIcon) => {
        eyeIcon.addEventListener("click", () => {
          const modal = document.getElementById("modaleFile");
          expect(modal).toBeTruthy();
        });
        fireEvent.click(eyeIcon);
      });
    });

    test("Then the create new bill button should work", async () => {
      const testInstance = setupBills();
      const billsData = await testInstance.getBills();
      document.body.innerHTML = BillsUI({ data: billsData });
      const newBillButton = screen.getByTestId("btn-new-bill");
      const handleClickNewBill = jest.fn(testInstance.handleClickNewBill);
      newBillButton.addEventListener("click", handleClickNewBill);
      fireEvent.click(newBillButton);
      expect(handleClickNewBill).toHaveBeenCalled();
    });

    test("Then the Bills page should display fetched bills correctly", async () => {
      setupPage(ROUTES_PATH.Bills);

      await waitFor(() => screen.getByText("Mes notes de frais"));
      const headerNotes = screen.getByText("Mes notes de frais");
      expect(headerNotes).toBeTruthy();

      const billsInstance = setupBills();
      const billsData = await billsInstance.getBills();
      expect(billsData.length).toBe(4);
    });

    describe("When an error occurs on API", () => {

      // Avant chaque test d'erreur, configure le mockStore pour espionner les appels

      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        setupPage(ROUTES_PATH.Bills);
      });

      // Fonction pour tester les erreurs de récupération
      
      const testFetchError = async (errorMessage) => {
        mockStore.bills.mockImplementationOnce(() => ({
          list: () => Promise.reject(new Error(errorMessage)),
        }));
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = screen.getByText(new RegExp(errorMessage, 'i'));
        expect(message).toBeTruthy();
      };

      test("Then fetches fails with 404 message error from mock API GET", async () => {
        await testFetchError("Erreur 404");
      });

      test("Then fetches fails with 500 message error from mock API GET", async () => {
        await testFetchError("Erreur 500");
      });
    });
  });
});

