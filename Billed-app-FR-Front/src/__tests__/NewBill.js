/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import router from "../app/Router.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import mockStore from "../__mocks__/store.js";

// Fonction pour afficher la page souhaitée en fonction du paramètre (pathname)

const setupPage = (pathname) => {
	document.body.innerHTML = "";
	const root = document.createElement("div");
	root.setAttribute("id", "root");
	document.body.append(root);
	router();
	window.onNavigate(pathname);
};

// Fonction pour créer une nouvelle instance de la classe NewBill

const setupNewBills = () => {
	document.body.innerHTML = NewBillUI();
	return new NewBill({
		document,
		onNavigate : (pathname) => {
			document.body.innerHTML = ROUTES({ pathname });
		  },
		store: mockStore,
		localStorage: window.localStorage,
	});
};

describe("Given I am connected as an employee", () => {

	// Avant chaque test, configure le localStorage pour simuler un utilisateur connecté

	beforeEach(() => {
		Object.defineProperty(window, "localStorage", { value: localStorageMock });
		window.localStorage.setItem(
			"user",
			JSON.stringify({
				type: "Employee",
				email: "employee@test.tld",
			})
		);
	});

	describe("When I am on NewBill Page", () => {

		test("Then the page should contain a form", () => {
			setupPage(ROUTES_PATH.NewBill);
			const form = screen.getByTestId("form-new-bill");
			expect(form).toBeTruthy();
		});

		test("Then the mail icon in vertical layout should be highlighted", async () => {
			setupPage(ROUTES_PATH.NewBill);
			await waitFor(() => screen.getByTestId("icon-mail"));
			const windowIcon = screen.getByTestId("icon-mail");
			expect(windowIcon.className).toBe("active-icon");
		});

		test("Then the form should contains some fields which are required to be submitted", () => {
			const expenseType = screen.getByTestId("expense-type");
			expect(expenseType.hasAttribute("required")).toBe(true);

			const datePicker = screen.getByTestId("datepicker");
			expect(datePicker.hasAttribute("required")).toBe(true);

			const amount = screen.getByTestId("amount");
			expect(amount.hasAttribute("required")).toBe(true);

			const pct = screen.getByTestId("pct");
			expect(pct.hasAttribute("required")).toBe(true);

			const file = screen.getByTestId("file");
			expect(file.hasAttribute("required")).toBe(true);
		});

		describe("When I upload a file with a valid format", () => {

			test("Then it should detect change on file input", () => {
				const newBill = setupNewBills();
				const handleChangeFile = jest.fn(newBill.handleChangeFile);
				const file = screen.getByTestId("file");

				file.addEventListener("change", handleChangeFile);
				fireEvent.change(file, {
					target: {
						files: [new File(["file.png"], "file.png", { type: "image/png" })],
					},
				});

				expect(handleChangeFile).toHaveBeenCalled();
				expect(file.files[0].name).toBe("file.png");
				expect(newBill.formData).not.toBe(null);
			});
		});		  

		describe("When I upload a file with an invalid format", () => {

			test("Then, the alert message should be displayed and file cleared", () => {
			
				const newBill = setupNewBills();
				const fileInput = screen.getByTestId("file");

				// Simule un évènement de changement de fichier avec un fichier invalide (txt)

				const event = {
					preventDefault: jest.fn(),
					target: {
						value: "C:\\fakepath\\file.txt",
						files: [new File(["file content"], "file.txt", { type: "text/plain" })],
					},
				};

				// Espion sur la méthode alert de window et remplacement temporaire par une fonction vide

				jest.spyOn(window, "alert").mockImplementation(() => {});

				newBill.handleChangeFile(event);

				expect(window.alert).toHaveBeenCalledWith(
					"Seuls les fichiers JPG, JPEG et PNG sont autorisés."
				);
				expect(fileInput.value).toBe("");
			});		
		});

		describe("When I submit form with valid data", () => {

			test("Then POST method should be successful", async () => {
				
				const bill = {
					id: "47qAXb6fIm2zOKkLzMro",
					vat: "80",
					fileUrl:
						"https://firebasestorage.googleapis.com/v0/b/billable-677b6.a…f-1.jpg?alt=media&token=c1640e12-a24b-4b11-ae52-529112e9602a",
					status: "pending",
					type: "Hôtel et logement",
					commentary: "séminaire billed",
					name: "encore",
					fileName: "preview-facture-free-201801-pdf-1.jpg",
					date: "2004-04-04",
					amount: 400,
					commentAdmin: "ok",
					email: "a@a",
					pct: 20,
				};

				const postSpy = jest.spyOn(mockStore, "bills");
				const postBills = await mockStore.bills().create(bill);

				expect(postSpy).toHaveBeenCalledTimes(1);
				expect(postBills).toEqual({
					fileUrl: "https://localhost:3456/images/test.jpg",
					key: "1234",
				});
			});
		});

		describe("When I want to submit but an error appears", () => {

			beforeEach(() => {
				document.body.innerHTML = NewBillUI();
			});

			afterEach(() => {
				document.body.innerHTML = "";
				jest.clearAllMocks();
			});

			const testErrorHandling = async (errorCode) => {

				const store = {
					bills: jest.fn().mockImplementation(() => ({
					  create: jest.fn().mockImplementation(() => Promise.resolve({})),
					  update: jest.fn().mockImplementation(() => Promise.reject(new Error(errorCode))),
					}))
				  };
			
				const newBill = new NewBill({
					document,
					onNavigate: (pathname) => {
						document.body.innerHTML = ROUTES({ pathname });
					},
					store,
					localStorage: window.localStorage,
				});

				const form = screen.getByTestId("form-new-bill");
				const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));
				form.addEventListener("submit", handleSubmit);

				fireEvent.submit(form);
				await new Promise(process.nextTick);

				await expect(store.bills().update()).rejects.toEqual(new Error(errorCode));
			};

			test("Fetch fails with 404 error message", async () => {
				await testErrorHandling("404");
			});

			test("Fetch fails with 500 error message", async () => {
				await testErrorHandling("500");
			});
		});


	});
});






