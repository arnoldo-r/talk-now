import React, { useState, useEffect, useRef } from "react";
import { useSubscription, useMutation, useQuery, gql } from "@apollo/client";
import "./style.css";

const POST_MESSAGE = gql`
  mutation ($user: String!, $content: String!) {
    postMessage(user: $user, content: $content)
  }
`;

const GET_MESSAGES = gql`
  query {
    messages {
      id
      content
      user
    }
  }
`;

const MESSAGES_SUBSCRIPTION = gql`
  subscription {
    messages {
      id
      content
      user
    }
  }
`;

function App() {
  const [state, setState] = useState({
    user: "",
    content: "",
  });
  const [messages, setMessages] = useState([]);

  const { data: initialData } = useQuery(GET_MESSAGES);

  const { data: subscriptionData } = useSubscription(MESSAGES_SUBSCRIPTION);

  const [postMessage] = useMutation(POST_MESSAGE);

  const chatContainerRef = useRef(null);

  const [nameLocked, setNameLocked] = useState(false);

  useEffect(() => {
    if (initialData) {
      setMessages(initialData.messages);
    }
  }, [initialData]);

  useEffect(() => {
    if (subscriptionData) {
      const newMessages = subscriptionData.messages.filter(
        (newMessage) =>
          !messages.some((oldMessage) => oldMessage.id === newMessage.id)
      );
      if (newMessages.length > 0) {
        setMessages((prevMessages) => [...prevMessages, ...newMessages]);
      }
    }
  }, [subscriptionData]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    try {
      if (state.content.length > 0) {
        await postMessage({ variables: state });
        setNameLocked(true);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
    setState({ ...state, content: "" });
  };

  return (
    <div>
      <div className="chat-container">
        <main
          className="chat-scroll"
          ref={chatContainerRef}
          style={{ overflowY: "scroll", padding: "1rem" }}
        >
          {messages.map(({ id, user, content }) => (
            <div key={id}>
              <kbd>
                <strong>{user}:</strong> {content}
              </kbd>
            </div>
          ))}
        </main>
      </div>
      <footer className="input-area">
        <input
          style={{ height: "100%" }}
          type="text"
          placeholder="Nombre"
          value={state.user}
          onChange={(e) =>
            setState({
              ...state,
              user: e.target.value,
            })
          }
          disabled={nameLocked}
        />
        <textarea
          type="text"
          placeholder="Mensaje"
          value={state.content}
          onChange={(e) =>
            setState({
              ...state,
              content: e.target.value,
            })
          }
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              handleSend();
            }
          }}
        />
        <button onClick={handleSend}>Enviar</button>
      </footer>
    </div>
  );
}

export default App;
