import React, { useState } from "react";
import {
  Form,
  Grid,
  Button,
  Header,
  Input,
  TextArea,
  Segment,
  Message,
} from "semantic-ui-react";
import { useMutation } from "@apollo/client";
import emailjs from "@emailjs/browser";
import { storeInLocalStorage } from "../utils/helper";
import { CREATE_ENQUIRY } from "../utils/mutations";

const ContactUs = () => {
  const emailKey = process.env.REACT_APP_EMAIL_KEY;
  const emailService = process.env.REACT_APP_EMAIL_SERVICE;
  const contactTemplate = process.env.REACT_APP_CONTACT_TEMPLATE;

  emailjs.init(emailKey);
  // get user state
  storeInLocalStorage({ name: "current_page", value: "contact" });
  const [success, setSuccess] = useState(false);

  // set initial form state
  const [userFormData, setUserFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
    contact: "",
  });
  const [addQuestion, { error }] = useMutation(CREATE_ENQUIRY);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setUserFormData({ ...userFormData, [name]: value });
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      await addQuestion({ variables: { ...userFormData } });
      emailjs
        .sendForm(emailService, contactTemplate, event.target, emailKey)
        .then(
          (result) => {
            setSuccess(true);
          },
          (error) => {
            console.log(error.text);
          }
        );
    } catch (err) {
      console.error(err);
    }

    setUserFormData({
      firstName: "",
      lastName: "",
      email: "",
      message: "",
      contact: "",
    });
  };

  return (
    <>
      <Grid textAlign="center" verticalAlign="middle">
        <Grid.Column style={{ maxWidth: 450 }}>
          <Header
            as="h2"
            size="large"
            textAlign="center"
            content="Send us an enquiry"
          />
          <Form onSubmit={handleFormSubmit}>
            <Segment stacked>
              <Form.Group widths="equal">
                <Form.Field
                  id="form-input-control-first-name"
                  control={Input}
                  required={true}
                  label="First name"
                  placeholder="First name"
                  value={userFormData.firstName}
                  name="firstName"
                  onChange={handleInputChange}
                />
                <Form.Field
                  id="form-input-control-last-name"
                  control={Input}
                  label="Last name"
                  placeholder="Last name"
                  value={userFormData.lastName}
                  name="lastName"
                  onChange={handleInputChange}
                />
              </Form.Group>
              <Form.Field
                id="form-input-control-number"
                control={Input}
                label="Contact Number"
                placeholder="Contact Number"
                value={userFormData.contact}
                name="contact"
                onChange={handleInputChange}
              />
              <Form.Field
                id="form-textarea-control-opinion"
                control={TextArea}
                required={true}
                label="Message"
                placeholder="Message"
                value={userFormData.message}
                name="message"
                onChange={handleInputChange}
              />
              {error ? (
                <Form.Field
                  id="form-input-control-error-email"
                  control={Input}
                  required={true}
                  label="Email"
                  placeholder="Email address"
                  value={userFormData.email}
                  name="email"
                  onChange={handleInputChange}
                  error={{
                    content: "Please enter a valid email address",
                    pointing: "below",
                  }}
                />
              ) : (
                <Form.Field
                  id="form-input-control-error-email"
                  control={Input}
                  required={true}
                  label="Email"
                  placeholder="Email address"
                  value={userFormData.email}
                  name="email"
                  onChange={handleInputChange}
                />
              )}
              <Form.Field
                id="form-button-control-public"
                control={Button}
                fluid
                size="large"
                content="Submit Form"
              />
              {success && (
                <Message
                  header="Thank you!"
                  content="We'll get back to you as soon as we can"
                />
              )}
            </Segment>
          </Form>
        </Grid.Column>
      </Grid>
    </>
  );
};

export default ContactUs;
