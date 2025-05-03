function ImageButton({src, onClick}) {

    return (
        <div
            className={"image-button"}
            onClick={onClick}>
            <img src={src} />
        </div>
    );
}

export default ImageButton;
