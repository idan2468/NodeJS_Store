# NodeJS_Store
This is my first website built with NodeJS + Express as backend integreted with MongoDB.

The website is an online store that features the following:

1. Authoriziotion with user and password, using sessions.
2. Full integreation using MongoDB (mongoose) with CRUD opertions on products in the online store.
3. Accessesability and secuirty applied (restricted access to non logged in user, csrf protection, encrypted passwords and more...)
3. Integration with theird party API like:
    a. Stripe - For processing payment in secure way.
    b. Sendgrid - For sending automated emails like reset password email and regiteration confirmation email
    c. pdfkit - For creating Invoices in a pdf format
    d. cloudinary - For storing on the cloud images/files permenently
4. Full Error handling
